import { useCallback, useRef } from "react";
import type { Project } from "../types";
import type { Player } from "../hooks/usePlayer";
import { ICONS } from "../icons";
import { clamp, fmtTime } from "../utils/time";

interface Props {
  project: Project;
  player: Player;
  activeId: string | null;
  onSelectButton: (id: string) => void;
}

export default function Timeline({ project, player, activeId, onSelectButton }: Props) {
  const { duration, time } = player;
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || !duration) return;
      const r = el.getBoundingClientRect();
      player.seek(clamp((clientX - r.left) / r.width, 0, 1) * duration);
    },
    [duration, player]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    player.videoRef.current?.pause();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    seekFromEvent(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) seekFromEvent(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const pct = (t: number) => (duration ? (t / duration) * 100 : 0);
  const ticks: number[] = [];
  if (duration > 0) {
    const stepSec = duration > 60 ? 10 : 5;
    for (let t = 0; t <= duration; t += stepSec) ticks.push(t);
  }

  return (
    <div className="border-t border-line bg-panel px-4 pb-3 pt-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim">
          Timeline
        </span>
        <span className="font-mono text-[11px] text-mut">
          <span className="text-amber">{fmtTime(time)}</span> / {fmtTime(duration)}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative h-[74px] cursor-ew-resize touch-none overflow-hidden rounded-lg bg-panel2 ring-1 ring-line"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* ruler */}
        <div className="absolute inset-x-0 top-0 h-5 border-b border-line/70">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 flex h-full flex-col justify-end"
              style={{ left: `${pct(t)}%` }}
            >
              <span className="h-2 w-px bg-line2" />
              <span className="absolute left-1 top-0 font-mono text-[9px] text-dim">
                {fmtTime(t)}
              </span>
            </span>
          ))}
        </div>

        {/* cue button row */}
        <div className="absolute inset-x-0 top-6 h-5">
          {project.buttons.map((b) => {
            const Icon = ICONS[b.icon];
            const end = b.end ?? duration;
            return (
              <button
                key={b.id}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onSelectButton(b.id);
                  player.playSegment(b.start, b.end);
                }}
                title={`${b.label} · ${fmtTime(b.start)}${b.end ? `–${fmtTime(b.end)}` : "→"}`}
                className="group absolute top-0 flex h-full items-center"
                style={{ left: `${pct(b.start)}%`, width: `${Math.max(pct(end) - pct(b.start), 1.2)}%` }}
              >
                <span
                  className="h-full w-full rounded-sm opacity-70 transition-opacity group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(90deg, ${b.color}55, ${b.color}22)`,
                    boxShadow: `inset 0 0 0 1px ${b.color}${activeId === b.id ? "" : "66"}`,
                    outline: activeId === b.id ? `2px solid ${b.color}` : "none",
                  }}
                />
                <Icon
                  className="pointer-events-none absolute left-1 top-1/2 h-3 w-3 -translate-y-1/2"
                  style={{ color: b.color }}
                  strokeWidth={2.5}
                />
              </button>
            );
          })}
        </div>

        {/* info card ranges row */}
        <div className="absolute inset-x-0 top-12 h-4">
          {project.cards.map((c) => (
            <div
              key={c.id}
              title={`${c.title} ${c.subtitle} · ${fmtTime(c.start)}–${fmtTime(c.end)}`}
              className="absolute top-0 h-full rounded-sm"
              style={{
                left: `${pct(c.start)}%`,
                width: `${Math.max(pct(c.end) - pct(c.start), 1)}%`,
                background: `${c.accent}30`,
                boxShadow: `inset 0 0 0 1px ${c.accent}88`,
              }}
            >
              <span
                className="absolute left-1 top-1/2 -translate-y-1/2 truncate font-mono text-[8px] font-semibold uppercase"
                style={{ color: c.accent }}
              >
                {c.title}
              </span>
            </div>
          ))}
        </div>

        {/* playhead */}
        <div
          className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-amber shadow-[0_0_8px_rgba(255,178,36,0.8)]"
          style={{ left: `${pct(time)}%` }}
        >
          <span className="absolute -left-[5px] top-0 h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-amber" />
        </div>
      </div>

      {/* legend */}
      <div className="mt-1.5 flex items-center gap-4 font-mono text-[9px] uppercase tracking-widest text-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-amber/40 ring-1 ring-amber/60" /> cue segments
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-sky/30 ring-1 ring-sky/60" /> info cards
        </span>
        <span className="ml-auto hidden sm:block">drag to scrub · click a segment to play it</span>
      </div>
    </div>
  );
}
