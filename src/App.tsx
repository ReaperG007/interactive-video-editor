import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  CheckCircle2,
  Download,
  Eye,
  FolderOpen,
  Keyboard,
  PanelLeft,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  TriangleAlert,
  X,
} from "lucide-react";
import type { Project } from "./types";
import { DEFAULT_PROJECT } from "./defaults";
import { usePlayer } from "./hooks/usePlayer";
import PreviewStage from "./components/PreviewStage";
import Sidebar from "./components/Sidebar";
import Timeline from "./components/Timeline";
import { makeStandaloneHtml, type VideoMode } from "./export/standalone";
import { fmtTime } from "./utils/time";
import { cn } from "./utils/cn";

const STORAGE_KEY = "cuewalk-project-v1";

function loadProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Project;
      if (p && typeof p.videoUrl === "string" && Array.isArray(p.buttons)) {
        // device-imported blob URLs don't survive a reload
        if (p.videoUrl.startsWith("blob:") || p.videoUrl.startsWith("data:video"))
          p.videoUrl = DEFAULT_PROJECT.videoUrl;
        return {
          ...DEFAULT_PROJECT,
          ...p,
          logo: { ...DEFAULT_PROJECT.logo, ...p.logo },
          slider: { ...DEFAULT_PROJECT.slider, ...p.slider },
          info: { ...DEFAULT_PROJECT.info, ...p.info },
          cards: p.cards ?? [],
          links: p.links ?? [],
          cueGroups: p.cueGroups ?? [],
        };
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PROJECT;
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "cuewalk-project"
  );
}

function videoExtension(url: string, mime: string) {
  const fromUrl = url.split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i)?.[1];
  if (fromUrl && ["mp4", "webm", "mov", "m4v", "ogv"].includes(fromUrl.toLowerCase())) {
    return fromUrl.toLowerCase();
  }
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("ogg")) return "ogv";
  return "mp4";
}

const README = `CueWalk — interactive video export
==================================

Files
-----
index.html          Standalone interactive player (open this)
src/project.json    All cues, cards, links, scenes and HUD settings
src/video.*         Bundled video (only when exported from a device upload)
src/video-source.txt Notes about the video source

How to run
----------
Open index.html in any modern browser, or upload the whole folder to
any static host (Netlify, Vercel, GitHub Pages, S3, an intranet server).

Controls
--------
Touch to start      Plays the assigned scene / scrub window once
Cue buttons         Jump to and play their assigned part
Dropdown cues       Corner menus with sub-cues
Scene chips         Sections of the top scroller (wheel or swipe to change)
Reset               Restores the very first state
Keys                Space play · arrows step frames · M mute · I info
                    R rotate · F fullscreen · 0 reset · Esc close panels
`;

interface Toast {
  id: number;
  msg: string;
  kind: "ok" | "warn";
}

export default function App() {
  const [project, setProjectState] = useState<Project>(loadProject);
  const [present, setPresent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAllCards, setShowAllCards] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showKeys, setShowKeys] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastId = useRef(0);

  const player = usePlayer();

  const setProject = useCallback(
    (fn: (p: Project) => Project) => setProjectState((prev) => fn(prev)),
    []
  );

  // persist
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch {
        /* storage full — ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [project]);

  const toast = useCallback((msg: string, kind: "ok" | "warn" = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  // clear active cue once its segment has played past the end
  useEffect(() => {
    if (!activeId) return;
    const b = [
      ...project.buttons,
      ...project.cueGroups.flatMap((g) => g.subCues),
    ].find((x) => x.id === activeId);
    if (b?.end != null && player.time >= b.end - 0.05) setActiveId(null);
  }, [player.time, activeId, project.buttons, project.cueGroups]);

  // stop playback at the end of the assigned scrub window
  useEffect(() => {
    const s = project.slider;
    if (!s.limitEnabled || !player.playing) return;
    const end = Math.min(s.limitEnd, player.duration || s.limitEnd);
    if (player.time >= end - 0.03) player.videoRef.current?.pause();
  }, [player.time, player.playing, player.duration, player.videoRef, project.slider]);

  // clear active if user scrubs outside the segment
  const handleSeekButton = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const onCueClick = useCallback(
    (id: string) => {
      const b = [
        ...project.buttons,
        ...project.cueGroups.flatMap((g) => g.subCues),
      ].find((x) => x.id === id);
      if (!b) return;
      setActiveId(id);
      player.playSegment(b.start, b.end);
      toast(
        `Playing “${b.label}” · ${fmtTime(b.start)}${
          b.end != null ? ` → ${fmtTime(b.end)}` : " → end"
        }`
      );
    },
    [project.buttons, project.cueGroups, player, toast]
  );

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        player.togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        player.stepFrame(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        player.stepFrame(-1);
      } else if (e.key === "Escape" && present) {
        setPresent(false);
      } else if (e.key.toLowerCase() === "b") {
        setSidebarOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player, present]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "cuewalk-project.json");
    toast("Project exported");
  };

  const exportZip = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      const src = zip.folder("src");
      let videoPath = project.videoUrl;
      const isDeviceVideo =
        project.videoUrl.startsWith("blob:") || project.videoUrl.startsWith("data:video");
      let videoMode: VideoMode = isDeviceVideo ? "bundled" : "linked";

      if (isDeviceVideo) {
        try {
          const res = await fetch(project.videoUrl);
          if (!res.ok) throw new Error(`video fetch failed: ${res.status}`);
          const blob = await res.blob();
          const ext = videoExtension(project.videoUrl, blob.type);
          videoPath = `src/video.${ext}`;
          src?.file(`video.${ext}`, blob);
          src?.file(
            "video-source.txt",
            `This ZIP bundles the device-uploaded video as src/video.${ext}\n`
          );
        } catch {
          videoMode = "missing";
          videoPath = "";
          src?.file(
            "video-source.txt",
            "The browser could not package the device-uploaded video. Try exporting again after re-selecting the local file.\n"
          );
        }
      } else {
        src?.file(
          "video-source.txt",
          `This ZIP uses an embedded remote video link instead of bundling the video file.\n\nVideo src:\n${project.videoUrl}\n`
        );
      }

      const exportedProject: Project = { ...project, videoUrl: videoPath };

      src?.file("project.json", JSON.stringify(exportedProject, null, 2));
      zip.file("index.html", makeStandaloneHtml(exportedProject, videoMode));
      zip.file("README.txt", README);

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${slug(project.logo.text || "cuewalk-project")}.zip`);
      toast(
        videoMode === "bundled"
          ? "ZIP exported with video file"
          : videoMode === "linked"
            ? "ZIP exported with embedded video link"
            : "ZIP exported without bundled video",
        videoMode === "missing" ? "warn" : "ok"
      );
    } catch {
      toast("Export failed — try again", "warn");
    } finally {
      setExporting(false);
    }
  };

  const importJson = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(String(r.result)) as Project;
        if (!p || typeof p.videoUrl !== "string" || !Array.isArray(p.buttons))
          throw new Error("bad");
        setProjectState({
          ...DEFAULT_PROJECT,
          ...p,
          logo: { ...DEFAULT_PROJECT.logo, ...p.logo },
          slider: { ...DEFAULT_PROJECT.slider, ...p.slider },
          info: { ...DEFAULT_PROJECT.info, ...p.info },
          cards: p.cards ?? [],
          links: p.links ?? [],
          cueGroups: p.cueGroups ?? [],
        });
        toast("Project imported");
      } catch {
        toast("That file isn't a CueWalk project", "warn");
      }
    };
    r.readAsText(file);
  };

  const reset = () => {
    setProjectState(DEFAULT_PROJECT);
    setActiveId(null);
    toast("Reset to sample project");
  };

  const stats = useMemo(
    () => ({
      cues: project.buttons.length,
      cards: project.cards.length,
      dur: fmtTime(player.duration),
    }),
    [project, player.duration]
  );

  const chromeHidden = present;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ============ top bar ============ */}
      <header
        className={cn(
          "flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-4 transition-opacity duration-300",
          chromeHidden && "pointer-events-none hidden"
        )}
      >
        <TopBtn
          onClick={() => setSidebarOpen((s) => !s)}
          label={sidebarOpen ? "Hide panel (B)" : "Show panel (B)"}
        >
          <PanelLeft className="h-4 w-4" />
        </TopBtn>
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-raise ring-1 ring-line2">
            <Play className="h-3.5 w-3.5 fill-amber text-amber" />
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-[17px] font-extrabold tracking-tight">
              Cue<span className="text-amber">Walk</span>
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-dim">
              interactive scene builder
            </p>
          </div>
        </div>

        <div className="mx-2 hidden h-6 w-px bg-line md:block" />

        <div className="hidden items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-dim md:flex">
          <span>
            <b className="text-mut">{stats.cues}</b> cues
          </span>
          <span className="h-3 w-px bg-line" />
          <span>
            <b className="text-mut">{stats.cards}</b> cards
          </span>
          <span className="h-3 w-px bg-line" />
          <span>
            <b className="text-mut">{stats.dur}</b> clip
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <TopBtn onClick={() => setShowKeys(true)} label="Shortcuts">
            <Keyboard className="h-4 w-4" />
          </TopBtn>
          <TopBtn onClick={() => fileRef.current?.click()} label="Import project">
            <FolderOpen className="h-4 w-4" />
          </TopBtn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
          <TopBtn onClick={exportJson} label="Export project JSON">
            <Download className="h-4 w-4" />
          </TopBtn>
          <TopBtn onClick={reset} label="Reset to sample">
            <RotateCcw className="h-4 w-4" />
          </TopBtn>

          <div className="mx-1 h-6 w-px bg-line" />

          <button
            onClick={exportZip}
            disabled={exporting}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-line2 bg-panel2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-mut transition",
              exporting
                ? "cursor-wait opacity-60"
                : "hover:border-amber/60 hover:text-amber"
            )}
          >
            <Download className="h-4 w-4" />
            {exporting ? "Packing…" : "Export ZIP"}
          </button>

          <button
            onClick={() => setPresent(true)}
            className="flex items-center gap-2 rounded-lg bg-amber px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:brightness-110"
          >
            <Eye className="h-4 w-4" /> Present
          </button>
        </div>
      </header>

      {/* ============ workspace ============ */}
      <div className="flex min-h-0 flex-1">
        {/* sliding panel */}
        <div
          className={cn(
            "relative shrink-0 overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(.22,.9,.26,1)]",
            chromeHidden || !sidebarOpen ? "w-0" : "w-[330px]"
          )}
        >
          <div
            className={cn(
              "h-full w-[330px] transition-transform duration-500 ease-[cubic-bezier(.22,.9,.26,1)]",
              chromeHidden || !sidebarOpen ? "-translate-x-full" : "translate-x-0"
            )}
          >
            <Sidebar project={project} setProject={setProject} player={player} toast={toast} />
          </div>
        </div>

        <main className="relative flex min-w-0 flex-1 flex-col bg-ink">
          {/* ambient workspace backdrop */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_-10%,rgba(255,178,36,0.06),transparent_65%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:26px_26px]" />

          {/* transport */}
          <div
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5",
              chromeHidden && "hidden"
            )}
          >
            <TransportBtn onClick={() => player.stepFrame(-1)} label="Previous frame">
              <SkipBack className="h-4 w-4" />
            </TransportBtn>
            <button
              onClick={player.togglePlay}
              className="grid h-9 w-9 place-items-center rounded-lg bg-amber text-black transition hover:brightness-110"
              aria-label={player.playing ? "Pause" : "Play"}
            >
              {player.playing ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>
            <TransportBtn onClick={() => player.stepFrame(1)} label="Next frame">
              <SkipForward className="h-4 w-4" />
            </TransportBtn>

            <span className="ml-1 rounded-md bg-panel2 px-2.5 py-1 font-mono text-xs text-amber ring-1 ring-line">
              {fmtTime(player.time)}
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-dim sm:block">
              ← → step frames · space play
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-dim lg:block">
                Output preview
              </span>
              <button
                onClick={() => setPresent(true)}
                className="flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-2.5 py-1.5 text-[11px] font-semibold text-mut transition-colors hover:border-amber/50 hover:text-amber"
              >
                <Pencil className="h-3 w-3" /> editing live
              </button>
            </div>
          </div>

          {/* stage */}
          <div
            className={cn(
              "relative flex min-h-0 flex-1 items-center justify-center overflow-auto",
              chromeHidden ? "p-0" : "px-4 pb-3"
            )}
          >
            <div className={cn(chromeHidden ? "h-full w-full" : "w-full max-w-[1060px]")}>
              <PreviewStage
                project={project}
                player={player}
                present={present}
                activeId={activeId}
                showAllCards={showAllCards}
                onToggleCards={() => setShowAllCards((s) => !s)}
                onExitPresent={() => setPresent(false)}
                onCue={onCueClick}
              />
            </div>
          </div>

          <div className={cn("relative", chromeHidden && "hidden")}>
            <Timeline
              project={project}
              player={player}
              activeId={activeId}
              onSelectButton={handleSeekButton}
            />
          </div>
        </main>
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="anim-toast flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3.5 py-2.5 text-sm shadow-xl"
          >
            {t.kind === "ok" ? (
              <CheckCircle2 className="h-4 w-4 text-mint" />
            ) : (
              <TriangleAlert className="h-4 w-4 text-ember" />
            )}
            {t.msg}
          </div>
        ))}
      </div>

      {/* shortcuts modal */}
      {showKeys && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4"
          onClick={() => setShowKeys(false)}
        >
          <div
            className="anim-fade-up w-full max-w-sm rounded-xl border border-line bg-panel p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Keyboard shortcuts</h3>
              <button
                onClick={() => setShowKeys(false)}
                className="text-dim hover:text-fg"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {[
              ["Space", "Play / pause"],
              ["→", "Step one frame forward"],
              ["←", "Step one frame back"],
              ["B", "Slide editor panel in / out"],
              ["Esc", "Exit present mode"],
            ].map(([k, d]) => (
              <div key={k} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-mut">{d}</span>
                <kbd className="rounded border border-line2 bg-panel2 px-2 py-0.5 font-mono text-xs text-amber">
                  {k}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- small chrome ---------- */

function TopBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-dim transition-colors hover:bg-raise hover:text-fg"
    >
      {children}
    </button>
  );
}

function TransportBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-panel2 text-mut transition-colors hover:border-line2 hover:text-fg"
    >
      {children}
    </button>
  );
}
