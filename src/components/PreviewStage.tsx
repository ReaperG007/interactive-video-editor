import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Eye,
  Hand,
  Hexagon,
  Info,
  Loader2,
  Maximize,
  Minimize,
  RefreshCw,
  RotateCw,
  Sun,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Project } from "../types";
import type { Player } from "../hooks/usePlayer";
import { ICONS } from "../icons";
import { fmtClock, fmtTime } from "../utils/time";
import { cn } from "../utils/cn";

interface Props {
  project: Project;
  player: Player;
  present: boolean;
  activeId: string | null;
  showAllCards: boolean;
  onToggleCards: () => void;
  onExitPresent: () => void;
  onCue?: (id: string) => void;
}

export default function PreviewStage({
  project,
  player,
  present,
  activeId,
  showAllCards,
  onToggleCards,
  onExitPresent,
  onCue,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const wasPlaying = useRef(false);
  const [fs, setFs] = useState(false);
  const [rot, setRot] = useState<0 | 90 | 180 | 270>(0);
  const [box, setBox] = useState({ w: 16, h: 9 });
  const [infoOpen, setInfoOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [touchStarted, setTouchStarted] = useState(false);
  const [sceneIdx, setSceneIdx] = useState(0);
  const lastWheel = useRef(0);

  useEffect(() => {
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    setTouchStarted(false);
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

  const odd = rot === 90 || rot === 270;
  const rotScale = odd ? Math.max(box.w / box.h, box.h / box.w) : 1;

  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  };

  const { videoRef, time, duration, playing, loading, error } = player;
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

  const playAssignedWindow = () => {
    setTouchStarted(true);
    if (useScenes && activeScene) {
      player.playSegment(activeScene.scene.start, activeScene.scene.end);
      return;
    }
    // Touch-to-start uses the assigned scrub window; with no window it plays the full clip.
    player.playSegment(sMin, lim ? sMax : duration || null);
  };

  return (
    <div
      ref={stageRef}
      className={cn(
        "group/stage relative w-full overflow-hidden bg-black select-none",
        present
          ? "h-full rounded-none"
          : "aspect-video rounded-xl ring-1 ring-line shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)]"
      )}
    >
      {/* ------- video (rotatable screen) ------- */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(.3,.8,.3,1)]"
        style={{ transform: `rotate(${rot}deg) scale(${rotScale})` }}
      >
        <video
          ref={videoRef}
          src={project.videoUrl}
          className="h-full w-full object-cover"
          playsInline
          muted={player.muted}
        onLoadStart={player.handlers.onLoadStart}
        onLoadedMetadata={player.handlers.onLoadedMetadata}
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
                  step={1 / 30}
                  value={rValue}
                  style={{ ["--fill" as string]: `${rFill}%` }}
                  onPointerDown={() => {
                    const v = videoRef.current;
                    wasPlaying.current = !!v && !v.paused;
                    v?.pause();
                  }}
                  onPointerUp={() => {
                    if (wasPlaying.current) {
                      wasPlaying.current = false;
                      videoRef.current?.play().catch(() => {});
                    }
                  }}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
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
                      className="truncate rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] transition-all hover:text-white"
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
          key={c.id + (showAllCards ? "-all" : "")}
          className={cn(
            "absolute top-1/2 z-10 w-60 -translate-y-1/2 sm:w-64",
            c.side === "left" ? "left-5 anim-card-left" : "right-5 anim-card-right"
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
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-4xl">
              {activeButton.label} <span className="text-white/60">mode</span>
            </h2>
            <div className="mt-1.5 h-px w-full bg-gradient-to-r from-white/70 to-transparent" />
          </div>
          <ChevronDown className="mb-1 h-6 w-6 text-white/70" />
        </div>
      )}

      {/* ------- corner cue dropdowns ------- */}
      {project.cueGroups.map((group) => {
        const GroupIcon = ICONS[group.icon];
        const open = openGroupId === group.id;
        const sideClass = group.side === "left" ? "left-5" : "right-5";
        return (
          <div
            key={group.id}
            className={cn("absolute bottom-[88px] z-30 w-56", sideClass)}
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
                          onCue?.(cue.id);
                          player.playSegment(cue.start, cue.end);
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
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.13em] text-white shadow-[0_12px_35px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all hover:bg-white/15",
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
      <div className="absolute inset-x-4 bottom-4 z-20">
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-2.5 py-2 backdrop-blur-md">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
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
                  onClick={() => {
                    onCue?.(b.id);
                    player.playSegment(b.start, b.end);
                  }}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold uppercase tracking-[0.14em] transition-all duration-200",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                  title={`Jump to ${fmtTime(b.start)}`}
                >
                  <Icon
                    className="h-4 w-4 transition-transform group-hover:scale-110"
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
            <UtilityBtn
              onClick={() => player.setMuted(!player.muted)}
              label={player.muted ? "Unmute" : "Mute"}
            >
              {player.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </UtilityBtn>
            <UtilityBtn
              onClick={() => setRot((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)}
              label={`Rotate screen (${rot}°)`}
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
        <button
          key={l.id}
          onClick={() => window.open(l.url, "_blank", "noopener")}
          className={cn(
            "anim-fade-up absolute z-20 flex items-center gap-2 rounded-full py-2 pl-3.5 pr-4 text-xs font-bold uppercase tracking-wider text-black shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)] transition-transform hover:scale-105 active:scale-95",
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
        <div className="anim-fade-up absolute bottom-20 right-4 z-30 w-80 max-w-[calc(100%-2rem)] overflow-hidden rounded-xl bg-white/10 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/25 backdrop-blur-xl">
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
                onClick={() => setInfoOpen(false)}
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

      {/* ------- touch-to-start assigned window ------- */}
      {!touchStarted && !playing && !loading && !error && (
        <button
          onClick={playAssignedWindow}
          className="anim-fade-up absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border border-white/25 bg-black/35 px-6 py-4 text-white shadow-[0_20px_60px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-amber/70 hover:bg-black/50"
          aria-label="Touch to start assigned video part"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-amber text-black shadow-[0_0_0_7px_rgba(255,178,36,0.14)]">
            <Hand className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-[0.16em]">
            Touch to start
          </span>
        </button>
      )}

      {/* ------- loading ------- */}
      {loading && !error && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/55">
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
    </div>
  );
}

function UtilityBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg transition-colors",
        active ? "bg-amber text-black" : "text-white/80 hover:bg-white/10 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
