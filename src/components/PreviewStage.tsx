import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  Hexagon,
  Info,
  Loader2,
  Maximize,
  Minimize,
  RefreshCw,
  Hand,
  RotateCw,
  Sun,
  X,
} from "lucide-react";
import {
  ASPECT_RATIO_VALUES,
  aspectRatioValue,
  isQuarterTurn,
  swapAspectRatio,
  type CueButton,
  type Project,
  type Rotation,
} from "../types";
import type { Player } from "../hooks/usePlayer";
import { ICONS } from "../icons";
import { fmtClock, fmtTime } from "../utils/time";
import { cn } from "../utils/cn";

interface Props {
  project: Project;
  setProject: (fn: (p: Project) => Project) => void;
  player: Player;
  present: boolean;
  activeId: string | null;
  showAllCards: boolean;
  onToggleCards: () => void;
  onExitPresent: () => void;
  onCue?: (id: string) => void;
  onExport?: () => void;
  exporting?: boolean;
}

export default function PreviewStage({
  project,
  setProject,
  player,
  present,
  activeId,
  showAllCards,
  onToggleCards,
  onExitPresent,
  onCue,
  onExport,
  exporting,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const wasPlaying = useRef(false);
  const autoPlayed = useRef(false);
  const [tapStart, setTapStart] = useState(false);
  const [fs, setFs] = useState(false);
  const [rot, setRot] = useState<Rotation>(project.display.rotation);
  const [sourceAspect, setSourceAspect] = useState(ASPECT_RATIO_VALUES["16:9"]);
  const [box, setBox] = useState({ w: 16, h: 9 });

  useEffect(() => {
    setRot(project.display.rotation);
  }, [project.display.rotation]);

  useEffect(() => {
    setSourceAspect(ASPECT_RATIO_VALUES["16:9"]);
  }, [project.videoUrl]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubVal, setScrubVal] = useState<number | null>(null);
  const scrubSession = useRef(false);
  const [gallery, setGallery] = useState<{ cue: CueButton; idx: number } | null>(null);
  const pendingCue = useRef<CueButton | null>(null);
  const galleryShown = useRef(false);
  const swipeStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const lastWheel = useRef(0);

  useEffect(() => {
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // reset the auto-play guard whenever the source or assigned window changes
  useEffect(() => {
    autoPlayed.current = false;
  }, [project.videoUrl, project.slider.limitStart, project.slider.limitEnd, project.slider.limitEnabled]);

  // track stage size so a rotated video still covers the frame
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      if (r.width && r.height) setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseAspect = aspectRatioValue(project.display.aspectRatio, sourceAspect);
  const outputAspect = isQuarterTurn(rot) ? swapAspectRatio(baseAspect) : baseAspect;
  const odd = isQuarterTurn(rot);
  // A quarter turn swaps the screen's unrotated width and height. Keeping
  // those bounds explicit lets the rotated screen fit exactly instead of
  // scaling it past the stage and clipping every interactive layer.
  const screenBox = odd
    ? { w: box.h, h: box.w }
    : box;
  const rotatableScreenStyle = odd
    ? {
        width: `${screenBox.w}px`,
        height: `${screenBox.h}px`,
        left: `${(box.w - screenBox.w) / 2}px`,
        top: `${(box.h - screenBox.h) / 2}px`,
        transform: `rotate(${rot}deg)`,
        transformOrigin: "center center",
      }
    : {
        inset: 0,
        transform: `rotate(${rot}deg)`,
        transformOrigin: "center center",
      };

  // responsive scale — design baseline 960×540
  const stageScale = screenBox.w && screenBox.h
    ? Math.max(Math.min(screenBox.w / 960, screenBox.h / 540), 0.4)
    : 1;
  const compactBar = (screenBox.w / stageScale) < 640;

  const finishScrub = () => {
    if (!scrubSession.current) return;
    scrubSession.current = false;
    setScrubbing(false);
    setScrubVal(null);
    if (wasPlaying.current) {
      wasPlaying.current = false;
      void videoRef.current?.play().catch(() => {});
    }
  };

  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  };

  const { videoRef, time, duration, loading, error } = player;
  const slider = project.slider;
  const logo = project.logo;
  const activeButton = [
    ...project.buttons,
    ...project.cueGroups.flatMap((group) => group.subCues),
  ].find((b) => b.id === activeId) ?? null;

  const visibleCards = project.cards.filter(
    (c) => showAllCards || (time >= c.start && time <= c.end)
  );

  const visibleLinks = project.links.filter(
    (l) => time >= l.start && time <= l.end
  );

  // scrub window — optionally limited to an assigned part of the clip
  const lim = slider.limitEnabled;
  const sMin = lim ? slider.limitStart : 0;
  const sMax = lim
    ? Math.min(slider.limitEnd, duration || slider.limitEnd)
    : Math.max(duration, 0.01);


  // ---- top scroller time sections (scenes) ----
  const sceneList = slider.sceneMode
    ? (slider.scenes ?? []).filter((s) => s.end > s.start)
    : [];
  const spans = sceneList.map((scene, i, arr) => {
    const offset = arr
      .slice(0, i)
      .reduce((sum, prev) => sum + (prev.end - prev.start), 0);
    return { scene, offset, dur: scene.end - scene.start };
  });
  const totalVirtual = spans.reduce((sum, s) => sum + s.dur, 0);
  const useScenes = spans.length > 0 && totalVirtual > 0;

  const liveSceneIdx = spans.findIndex(
    (s) => time >= s.scene.start && time <= s.scene.end
  );
  const activeSceneIdx = liveSceneIdx >= 0 ? liveSceneIdx : Math.min(sceneIdx, spans.length - 1);
  const activeScene = useScenes ? spans[Math.max(0, activeSceneIdx)] : null;

  const virtualValue =
    liveSceneIdx >= 0
      ? spans[liveSceneIdx].offset + (time - spans[liveSceneIdx].scene.start)
      : activeScene?.offset ?? 0;

  const virtualToActual = (v: number) => {
    for (const s of spans) {
      if (v >= s.offset && v <= s.offset + s.dur) return s.scene.start + (v - s.offset);
    }
    return spans.length ? spans[spans.length - 1].scene.end : 0;
  };

  const goToScene = (index: number, play: boolean) => {
    if (!useScenes) return;
    const i = Math.max(0, Math.min(spans.length - 1, index));
    const target = spans[i];
    setSceneIdx(i);
    if (play) player.playSegment(target.scene.start, target.scene.end);
    else player.seek(target.scene.start);
  };

  const onScrollScenes = (e: React.WheelEvent) => {
    if (!useScenes) return;
    const now = Date.now();
    if (now - lastWheel.current < 320) return;
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 2) return;
    lastWheel.current = now;
    goToScene(Math.max(0, activeSceneIdx) + (delta > 0 ? 1 : -1), true);
  };

  // slider range: virtual scene timeline, or the plain/limited clip window
  const rMin = useScenes ? 0 : sMin;
  const rMax = useScenes ? totalVirtual : sMax;
  const rValue = useScenes
    ? Math.max(0, Math.min(totalVirtual, virtualValue))
    : Math.max(sMin, Math.min(sMax, time));
  const rFill = rMax > rMin ? ((rValue - rMin) / (rMax - rMin)) * 100 : 0;

  // Show a blinking "Tap to start" icon once the video is ready. Tapping it
  // starts the assigned part — this also satisfies mobile autoplay policy.
  // Always shown once ready (regardless of the autoPlay flag) so the
  // experience can never be stuck paused with no way to start.
  useEffect(() => {
    if (player.error) {
      autoPlayed.current = false;
      setTapStart(false);
      return;
    }
    if (player.loading) return;
    if (autoPlayed.current) return;
    const v = videoRef.current;
    if (!v || !isFinite(v.duration) || v.duration <= 0) return;
    autoPlayed.current = true;
    setTapStart(true);
  }, [player.loading, player.error, useScenes, spans.length, lim, sMin, sMax]);

  const startFromTap = () => {
    setTapStart(false);
    if (useScenes && spans.length) {
      player.playSegment(spans[0].scene.start, spans[0].scene.end);
    } else {
      player.playSegment(sMin, lim ? sMax : null);
    }
  };

  // First interaction anywhere dismisses the tap overlay, but the tap is NEVER
  // swallowed: if it lands on a control (cue, dropdown, scrubber, link...), the
  // control handles it and plays its own scene; only empty-stage taps auto-play
  // the assigned part. The overlay is pointer-events-none, so it never blocks.
  useEffect(() => {
    if (!tapStart) return;
    const el = stageRef.current;
    if (!el) return;
    const dismiss = (e: PointerEvent) => {
      setTapStart(false);
      const t = e.target as HTMLElement | null;
      const onControl = !!t?.closest(
        'button,input,select,textarea,a,[role="button"]'
      );
      if (!onControl) startFromTap();
    };
    el.addEventListener("pointerdown", dismiss, true);
    return () => el.removeEventListener("pointerdown", dismiss, true);
  }, [tapStart]);

  const activateCue = (cue: CueButton) => {
    pendingCue.current = cue;
    galleryShown.current = false;
    setGallery(null);
    // App owns the cue action (active state, toast, and playback). Keep the
    // fallback for standalone use, but never issue the same play command twice.
    if (onCue) onCue(cue.id);
    else player.playSegment(cue.start, cue.end);
  };

  // when a cue with a gallery finishes its segment, show the gallery frame
  useEffect(() => {
    const cue = pendingCue.current;
    if (!cue) return;
    const imgs = (cue.gallery ?? []).filter((s) => s && s.trim());
    if (!imgs.length || galleryShown.current) return;
    const endedAt = cue.end != null ? cue.end : duration;
    if (!player.playing && time >= endedAt - 0.05) {
      galleryShown.current = true;
      pendingCue.current = null;
      setGallery({ cue, idx: 0 });
    }
  }, [time, player.playing, duration]);

  // closing the gallery when playback restarts or the user scrubs away
  useEffect(() => {
    if (player.playing) setGallery(null);
  }, [player.playing]);

  const stepGallery = (dir: 1 | -1) => {
    setGallery((g) => {
      if (!g) return g;
      const n = (g.cue.gallery ?? []).filter((s) => s && s.trim()).length;
      return { cue: g.cue, idx: (g.idx + dir + n) % n };
    });
  };

  return (
    <div
      ref={stageRef}
      className={cn(
        "group/stage relative w-full overflow-hidden bg-black select-none",
        present
          ? "h-full rounded-none"
          : "rounded-xl ring-1 ring-line shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)]"
      )}
      style={!present ? { aspectRatio: outputAspect } : undefined}
    >
      {/* ------- rotatable interactive screen (video + every panel) ------- */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(.3,.8,.3,1)]"
        style={rotatableScreenStyle}
      >
      {/* ------- video ------- */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          src={project.videoUrl}
          className="pointer-events-none h-full w-full object-cover"
          playsInline
        onLoadStart={player.handlers.onLoadStart}
        onLoadedMetadata={() => {
          player.handlers.onLoadedMetadata();
          const v = videoRef.current;
          if (v?.videoWidth && v.videoHeight) {
            setSourceAspect(`${v.videoWidth} / ${v.videoHeight}`);
          }
        }}
        onPlaying={player.handlers.onPlaying}
        onPause={player.handlers.onPause}
        onWaiting={player.handlers.onWaiting}
        onCanPlay={player.handlers.onCanPlay}
        onError={player.handlers.onError}
        onEnded={player.handlers.onEnded}
        />
      </div>


      {/* vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(0,0,0,0.45)_100%)]" />

      {/* ------- responsive scaled overlay ------- */}
      <div
        className="absolute top-0 left-0 z-10"
        style={{
          width: `${100 / stageScale}%`,
          height: `${100 / stageScale}%`,
          transform: `scale(${stageScale})`,
          transformOrigin: "top left",
        }}
      >
      {/* ------- top HUD: logo + scrub slider ------- */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-6 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-5 pb-12 pt-4">
        {/* logo */}
        <div
          className="flex shrink-0 items-center gap-2.5 transition-opacity"
          style={{
            opacity: logo.opacity / 100,
            transform: `scale(${logo.size / 100})`,
            transformOrigin: logo.position === "top-left" ? "left center" : "right center",
            marginLeft: logo.position === "top-right" ? "auto" : 0,
            order: logo.position === "top-right" ? 3 : 0,
          }}
        >
          {logo.mode === "image" && logo.image ? (
            <img
              src={logo.image}
              alt="logo"
              className="h-9 w-auto max-w-[140px] object-contain drop-shadow-lg"
            />
          ) : (
            <>
              <span className="relative grid h-9 w-9 place-items-center">
                <Hexagon className="h-9 w-9 text-amber drop-shadow" strokeWidth={1.6} />
                <Hexagon className="absolute h-5 w-5 text-ember" strokeWidth={2.2} />
              </span>
              <span className="leading-none">
                <span className="block font-display text-[22px] font-bold tracking-tight text-white drop-shadow">
                  {logo.text || "Logo"}
                </span>
                {logo.tagline && (
                  <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-white/60">
                    {logo.tagline}
                  </span>
                )}
              </span>
            </>
          )}
        </div>

        {/* center scrub slider */}
        {slider.enabled && (
          <div
            className="mx-auto flex w-full max-w-xl flex-col gap-1.5"
            onWheel={onScrollScenes}
          >
            <div className="flex items-center gap-4">
              <Sun className="h-5 w-5 shrink-0 text-white/90 drop-shadow" strokeWidth={2} />
              <div className="relative w-full">
                <input
                  type="range"
                  className="scrub w-full"
                  min={rMin}
                  max={rMax}
                  step={1 / slider.fps}
                  value={scrubbing && scrubVal != null ? scrubVal : rValue}
                  style={{ ["--fill" as string]: `${scrubbing && scrubVal != null ? ((scrubVal - rMin) / Math.max(1e-6, rMax - rMin)) * 100 : rFill}%` }}
                  onPointerDown={() => {
                    const v = videoRef.current;
                    scrubSession.current = true;
                    // Use React's playback state as well as the media element.
                    // On mobile, paused can still be true while play() is pending.
                    wasPlaying.current = player.playing || !!v && !v.paused;
                    v?.pause();
                    setScrubbing(true);
                    setScrubVal(rValue);
                  }}
                  onPointerUp={finishScrub}
                  onPointerCancel={finishScrub}
                  onLostPointerCapture={finishScrub}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    setScrubVal(raw);
                    player.seek(useScenes ? virtualToActual(raw) : raw);
                  }}
                  aria-label="Scrub frame by frame"
                />
                {useScenes && (
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 gap-px">
                    {spans.map((s, i) => (
                      <span
                        key={s.scene.id}
                        className="h-2.5 border-l border-white/45 first:border-l-0"
                        style={{
                          flex: s.dur,
                          opacity: i === activeSceneIdx ? 1 : 0.45,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-sm font-medium text-white drop-shadow">
                {slider.labelMode === "clock"
                  ? fmtClock(rMax > rMin ? (rValue - rMin) / (rMax - rMin) : 0, slider.clockFrom, slider.clockTo)
                  : fmtTime(time)}
                {lim && !useScenes && (
                  <span className="ml-1 hidden rounded bg-white/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/70 sm:inline">
                    window
                  </span>
                )}
              </span>
            </div>

            {useScenes && (
              <div className="flex items-center gap-1 pl-9 pr-[76px]">
                {spans.map((s, i) => {
                  const on = i === activeSceneIdx;
                  return (
                    <button
                      key={s.scene.id}
                      onClick={() => goToScene(i, true)}
                      style={{
                        flex: s.dur,
                        background: on ? `${s.scene.color}30` : "rgba(255,255,255,0.06)",
                        borderColor: on ? s.scene.color : "rgba(255,255,255,0.14)",
                        color: on ? "#fff" : "rgba(255,255,255,0.62)",
                      }}
                      className={cn("truncate rounded-md border transition-all hover:text-white font-bold uppercase", compactBar ? "px-2 py-1 text-[9px] tracking-[0.12em]" : "px-2 py-1 text-[9px] tracking-[0.14em]")}
                      title={`${s.scene.label} · ${fmtTime(s.scene.start)}–${fmtTime(s.scene.end)}`}
                    >
                      {s.scene.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* right timecode (edit mode) */}
        {!present && (
          <span className="ml-auto hidden shrink-0 rounded bg-black/40 px-2 py-1 font-mono text-[11px] text-white/70 ring-1 ring-white/10 sm:block">
            {fmtTime(time)} / {fmtTime(duration)}
          </span>
        )}
      </div>

      {/* ------- info cards ------- */}
      {visibleCards.map((c) => (
        <div
          key={c.id + (showAllCards ? "-all" : "")}            className={cn(
              "absolute top-1/2 z-10 -translate-y-1/2",
              compactBar ? "w-48" : "w-60 sm:w-64",
              c.side === "left" ? "left-3 sm:left-5 anim-card-left" : "right-3 sm:right-5 anim-card-right"
            )}
        >
          <div className="overflow-hidden rounded-md shadow-[0_18px_50px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/15">
            {c.image && (
              <div className="relative h-32 w-full overflow-hidden bg-panel2">
                <img src={c.image} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}
            <div className="bg-[#101216]/95 px-4 pb-3 pt-2.5 text-center backdrop-blur">
              <div
                className="font-display text-xl font-extrabold tracking-wide"
                style={{ color: c.accent }}
              >
                {c.title}
              </div>
              <div className="text-sm font-semibold text-ember">{c.subtitle}</div>
              {c.body && (
                <p className="mt-1.5 text-[11px] leading-snug text-mut">{c.body}</p>
              )}
            </div>
            <button
              className="block w-full bg-white/85 py-2 text-center text-sm font-bold text-[#15181d] transition-colors hover:bg-white"
              onClick={() => player.playSegment(c.start, c.end)}
            >
              {c.cta || "Explore"}
            </button>
          </div>
          {/* edit badge */}
          {!present && (
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-amber ring-1 ring-amber/40">
              {fmtTime(c.start)} – {fmtTime(c.end)}
            </span>
          )}
        </div>
      ))}

      {/* ------- big mode label ------- */}
      {activeButton && (
        <div className="anim-fade-up pointer-events-none absolute inset-x-5 bottom-[92px] flex items-end justify-between">
          <div>
            <h2 className={cn("font-display font-extrabold uppercase tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]", compactBar ? "text-2xl" : "text-3xl sm:text-4xl")}>
              {activeButton.label} <span className="text-white/60">mode</span>
            </h2>
            <div className="mt-1.5 h-px w-full bg-gradient-to-r from-white/70 to-transparent" />
          </div>
          <ChevronDown className="mb-1 h-6 w-6 text-white/70" />
        </div>
      )}

      {/* ------- corner cue dropdowns ------- */}
      {project.cueGroups.map((group, groupIndex) => {
        const GroupIcon = ICONS[group.icon];
        const open = openGroupId === group.id;
        const sideIndex = project.cueGroups
          .slice(0, groupIndex)
          .filter((candidate) => candidate.side === group.side).length;
        const sideOffset = sideIndex * (compactBar ? 184 : 232);
        const sideStyle =
          group.side === "left"
            ? { left: `${20 + sideOffset}px` }
            : { right: `${20 + sideOffset}px` };
        return (
          <div
            key={group.id}
            className={cn("absolute bottom-[88px] z-30", compactBar ? "w-44" : "w-56")}
            style={sideStyle}
          >
            {open && (
              <div className="anim-fade-up mb-2 overflow-hidden rounded-2xl border border-white/20 bg-black/30 p-2 shadow-[0_24px_70px_-18px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                <div className="mb-1 flex items-center justify-between px-2 py-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                    {group.label}
                  </span>
                  <span className="text-[10px] text-white/40">choose scene</span>
                </div>
                <div className="space-y-1">
                  {group.subCues.map((cue) => {
                    const CueIcon = ICONS[cue.icon];
                    const active = cue.id === activeId;
                    return (
                      <button
                        key={cue.id}
                        onClick={() => {
                          activateCue(cue);
                          setOpenGroupId(null);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-white/85 transition-colors hover:bg-white/15 hover:text-white",
                          active && "bg-white/15 text-white"
                        )}
                      >
                        <span
                          className="grid h-7 w-7 place-items-center rounded-lg"
                          style={{ background: `${cue.color}25`, color: cue.color }}
                        >
                          <CueIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{cue.label}</span>
                        <span className="font-mono text-[9px] text-white/45">
                          {fmtTime(cue.start)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              onClick={() => setOpenGroupId(open ? null : group.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.13em] text-white shadow-[0_12px_35px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all hover:bg-white/15 pointer-events-auto",
                open ? "bg-white/20" : "bg-black/35"
              )}
              style={{ borderColor: `${group.color}80` }}
            >
              <GroupIcon className="h-4 w-4" style={{ color: group.color }} />
              <span className="min-w-0 flex-1 truncate">{group.label}</span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                style={{ color: group.color }}
              />
            </button>
          </div>
        );
      })}

      {/* ------- bottom cue bar ------- */}
      <div className={cn("absolute bottom-4 z-20 safe-b safe-l safe-r pointer-events-auto", compactBar ? "inset-x-2 bottom-2" : "inset-x-4")}>
        <div className={cn("flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md", compactBar ? "gap-1 px-2 py-2" : "px-2.5 py-2")}>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto flex-wrap">
            {project.buttons.length === 0 && (
              <span className="px-3 py-1.5 text-xs text-white/50">
                No cue buttons yet — add some in the editor panel.
              </span>
            )}
            {project.buttons.map((b) => {
              const Icon = ICONS[b.icon];
              const active = b.id === activeId;
              return (
                <button
                  key={b.id}
                  onClick={() => activateCue(b)}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-2 rounded-lg transition-all duration-200",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                    compactBar ? "flex-1 justify-center px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em]" : "px-3 py-2 text-[12px] font-bold uppercase tracking-[0.14em]"
                  )}
                  title={`Jump to ${fmtTime(b.start)}`}
                >
                  <Icon
                    className={cn("transition-transform group-hover:scale-110", compactBar ? "h-4 w-4" : "h-4 w-4")}
                    style={{ color: active ? b.color : undefined }}
                    strokeWidth={2.2}
                  />
                  {b.label}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full transition-all duration-300",
                      active ? "opacity-100" : "opacity-0"
                    )}
                    style={{ background: b.color }}
                  />
                </button>
              );
            })}
          </div>

          {/* utility cluster */}
          <div className="flex shrink-0 items-center gap-0.5 border-l border-white/10 pl-2">
            {present && onExport && (
              <button
                onClick={onExport}
                disabled={exporting}
                title="Export this interactive player as a standalone ZIP"
                aria-label="Export interactive player as ZIP"
                className="mr-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85 transition-colors hover:bg-white/10 hover:text-amber disabled:cursor-wait disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {exporting ? "Packing" : "Export ZIP"}
              </button>
            )}
            <UtilityBtn
              onClick={() => {
                const next = (rot === 90 ? 0 : 90) as Rotation;
                setRot(next);
                setProject((p) => ({ ...p, display: { ...p.display, rotation: next } }));
              }}
              label={`Rotate all panels (${rot}°)`}
            >
              <RotateCw
                className="h-4 w-4 transition-transform duration-500"
                style={{ transform: `rotate(${rot}deg)` }}
              />
            </UtilityBtn>
            <UtilityBtn
              onClick={onToggleCards}
              label="Preview all cards"
              active={showAllCards}
            >
              <Eye className="h-4 w-4" />
            </UtilityBtn>
            <UtilityBtn
              onClick={() => setInfoOpen((o) => !o)}
              label="About this project"
              active={infoOpen}
            >
              <Info className="h-4 w-4" />
            </UtilityBtn>
            {present && (
              <UtilityBtn onClick={onExitPresent} label="Back to editor">
                <Minimize className="h-4 w-4" />
              </UtilityBtn>
            )}
            <UtilityBtn onClick={toggleFs} label="Fullscreen">
              {fs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </UtilityBtn>
          </div>
        </div>
      </div>

      {/* ------- link popups ------- */}
      {visibleLinks.map((l) => (
        <button          key={l.id}
          onClick={() => window.open(l.url, "_blank", "noopener")}
          className={cn(
              "anim-fade-up absolute z-20 flex items-center gap-2 rounded-full py-2 pl-3.5 pr-4 text-xs font-bold uppercase tracking-wider text-black shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)] transition-transform hover:scale-105 active:scale-95",
              compactBar ? "text-[10px] py-1.5 pl-2.5 pr-3" : "",
            {
              "top-left": "left-5 top-20",
              "top-right": "right-5 top-20",
              "bottom-left": "bottom-[140px] left-5",
              "bottom-right": "bottom-[140px] right-5",
            }[l.corner]
          )}
          style={{ background: l.color }}
          title={`Opens ${l.url}`}
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
          {l.label}
          {!present && (
            <span className="ml-0.5 font-mono text-[9px] font-medium normal-case opacity-60">
              {fmtTime(l.start)}–{fmtTime(l.end)}
            </span>
          )}
        </button>
      ))}

      {/* ------- glass info panel ------- */}
      {infoOpen && (
        <div className={cn("anim-fade-up absolute bottom-20 z-30 overflow-hidden rounded-xl bg-white/10 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/25 backdrop-blur-xl", compactBar ? "left-2 right-2 w-auto" : "right-4 w-80 max-w-[calc(100%-2rem)]")}>
          {project.info.image ? (
            <div className="relative h-36 w-full overflow-hidden">
              <img src={project.info.image} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            </div>
          ) : null}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-lg font-bold leading-tight text-white">
                {project.info.enabled ? project.info.title : "Info panel"}
              </h3>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoOpen(false);
                }}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Close info"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {project.info.enabled ? (
              <p className="mt-1.5 text-sm leading-relaxed text-white/85">
                {project.info.body}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-white/60">
                Enable and fill the info panel in the editor's HUD tab.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ------- cue gallery overlay ------- */}
      {gallery && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-[2px]"
          onClick={() => setGallery(null)}
        >
          <div
            className={cn(
              "anim-fade-up relative flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-black/85 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)] ring-1 ring-white/10 backdrop-blur-2xl",
              compactBar ? "w-[min(78vw,300px)]" : "w-[min(82vw,420px)]"
            )}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: "pan-y" }}
            onPointerDown={(e) => {
              if (!e.isPrimary) return;
              swipeStart.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
              e.currentTarget.setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              const start = swipeStart.current;
              if (!start || start.pointerId !== e.pointerId) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) e.preventDefault();
            }}
            onPointerUp={(e) => {
              const start = swipeStart.current;
              if (!start || start.pointerId !== e.pointerId) return;
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;
              swipeStart.current = null;
              if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
              stepGallery(dx < 0 ? 1 : -1);
            }}
            onPointerCancel={() => {
              swipeStart.current = null;
            }}
            role="dialog"
            aria-label="Image gallery"
          >
            {/* header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-white">
                {gallery.cue.label}{" "}
                <span className="text-white/50">gallery</span>
              </span>
              <button
                onClick={() => setGallery(null)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/25 hover:text-white"
                aria-label="Close gallery"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* image */}
            <div className="relative overflow-hidden">
              <img
                key={gallery.idx}
                src={(gallery.cue.gallery ?? []).filter((s) => s && s.trim())[gallery.idx]}
                alt=""
                draggable={false}
                className={cn(
                  "anim-fade-up w-full object-cover",
                  compactBar ? "h-48" : "h-64 sm:h-72"
                )}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 to-transparent" />
              {((gallery.cue.gallery ?? []).filter((s) => s && s.trim()).length > 1) && (
                <>
                  <button
                    onClick={() => stepGallery(-1)}
                    className="absolute left-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20 transition-all hover:scale-110 hover:bg-black/80"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => stepGallery(1)}
                    className="absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20 transition-all hover:scale-110 hover:bg-black/80"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* dots + counter */}
            <div className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-2.5">
              {(gallery.cue.gallery ?? [])
                .filter((s) => s && s.trim())
                .map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGallery({ cue: gallery.cue, idx: i })}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === gallery.idx ? "w-6 bg-amber" : "w-1.5 bg-white/30 hover:bg-white/60"
                    )}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              <span className="ml-2 font-mono text-[10px] text-white/50">
                {gallery.idx + 1} / {(gallery.cue.gallery ?? []).filter((s) => s && s.trim()).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------- tap to start (ANY tap anywhere dismisses and plays) ------- */}
      {tapStart && !loading && !error && (
        <div
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') startFromTap(); }}
          role="button"
          tabIndex={0}
          aria-label="Tap anywhere to start"
          className="pointer-events-none absolute inset-0 z-30 grid place-items-center"
        >
          <span className="pointer-events-none flex flex-col items-center gap-3 rounded-3xl border border-white/15 bg-black/45 px-8 py-6 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-transform">
            <span className="grid h-16 w-16 animate-pulse place-items-center rounded-full border-[1.5px] border-amber bg-amber/15 text-amber shadow-[0_0_0_10px_rgba(255,178,36,0.08)]">
              <Hand className="h-8 w-8" />
            </span>
            <span className="animate-pulse font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white">
              Tap to start
            </span>
          </span>
        </div>
      )}

      {/* ------- loading ------- */}
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-black/55">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber" />
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-white/70">
              Loading footage
            </span>
          </div>
        </div>
      )}

      {/* ------- error ------- */}
      {error && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#0d0f12]/95">
          <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-ember/15 ring-1 ring-ember/40">
              <AlertTriangle className="h-6 w-6 text-ember" />
            </span>
            <h3 className="font-display text-lg font-bold">Couldn't load this video</h3>
            <p className="text-sm text-mut">
              The source URL may be unreachable or blocked by CORS. Try a sample
              clip or paste a different MP4 link in the Video tab.
            </p>
            <button
              onClick={player.retry}
              className="mt-1 flex items-center gap-2 rounded-lg bg-amber px-4 py-2 text-sm font-bold text-black transition hover:brightness-110"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* edit chip */}
      {!present && (
        <span className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-amber ring-1 ring-amber/30">
          <span className="rec-dot h-1.5 w-1.5 rounded-full bg-amber" />
          Editor preview
        </span>
      )}
      </div>{/* end scaled overlay */}
      </div>{/* end rotatable screen */}
    </div>
  );
}

function UtilityBtn({
  children,
  onClick,
  label,
  active,
  compact,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid place-items-center rounded-lg transition-colors",
        compact ? "h-7 w-7" : "h-8 w-8",
        active ? "bg-amber text-black" : "text-white/80 hover:bg-white/10 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
