import { useState } from "react";
import {
  Clapperboard,
  Crosshair,
  Film,
  Hexagon,
  ImagePlus,
  Info,
  Link2,
  MousePointerClick,
  PanelsTopLeft,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import {
  ASPECT_RATIO_LABELS,
  ROTATION_OPTIONS,
  type AspectRatioPreset,
  type CueButton,
  type CueGroup,
  type FrameRate,
  type InfoCard,
  type LinkCard,
  type Project,
  type Rotation,
  type SliderScene,
} from "../types";
import { PALETTE, uid } from "../types";
import type { Player } from "../hooks/usePlayer";
import { ICON_OPTIONS, ICONS } from "../icons";
import { SAMPLE_VIDEOS } from "../defaults";
import { fmtTime } from "../utils/time";
import { cn } from "../utils/cn";

type Tab = "video" | "logo" | "buttons" | "cards" | "slider";

interface Props {
  project: Project;
  setProject: (fn: (p: Project) => Project) => void;
  player: Player;
  toast: (msg: string, kind?: "ok" | "warn") => void;
}

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "video", label: "Video", icon: Film },
  { id: "logo", label: "Logo", icon: Hexagon },
  { id: "buttons", label: "Cues", icon: MousePointerClick },
  { id: "cards", label: "Cards", icon: PanelsTopLeft },
  { id: "slider", label: "HUD", icon: SlidersHorizontal },
];

export default function Sidebar({ project, setProject, player, toast }: Props) {
  const [tab, setTab] = useState<Tab>("buttons");

  return (
    <aside className="flex h-full w-[330px] shrink-0 flex-col border-r border-line bg-panel">
      {/* tabs */}
      <div className="flex border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
              tab === t.id ? "text-amber" : "text-dim hover:text-mut"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-amber" />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {tab === "video" && <VideoTab project={project} setProject={setProject} toast={toast} />}
        {tab === "logo" && <LogoTab project={project} setProject={setProject} toast={toast} />}
        {tab === "buttons" && (
          <ButtonsTab project={project} setProject={setProject} player={player} toast={toast} />
        )}
        {tab === "cards" && (
          <CardsTab project={project} setProject={setProject} player={player} toast={toast} />
        )}
        {tab === "slider" && (
          <SliderTab project={project} setProject={setProject} player={player} />
        )}
      </div>
    </aside>
  );
}

/* ============================ shared bits ============================ */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-dim">
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-line bg-panel2 px-2.5 py-1.5 text-sm text-fg outline-none transition-colors placeholder:text-dim focus:border-amber/60 focus:ring-1 focus:ring-amber/30";

function TimeField({
  label,
  value,
  onChange,
  onSnap,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  onSnap: () => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <Label>{label}</Label>
      <div className="flex gap-1">
        <input
          type="number"
          step={0.5}
          min={0}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          className={cn(inputCls, "font-mono text-xs")}
        />
        <button
          onClick={onSnap}
          title="Set to current playhead"
          className="grid w-8 shrink-0 place-items-center rounded-md border border-line bg-panel2 text-dim transition-colors hover:border-amber/50 hover:text-amber"
        >
          <Crosshair className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Swatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PALETTE.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            "h-6 w-6 rounded-full transition-transform hover:scale-110",
            value === c && "ring-2 ring-white ring-offset-2 ring-offset-panel"
          )}
          style={{ background: c }}
          aria-label={`color ${c}`}
        />
      ))}
    </div>
  );
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-line bg-panel2 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "flex-1 rounded px-2 py-1 text-xs font-semibold transition-colors",
            value === o.v ? "bg-raise text-amber" : "text-dim hover:text-mut"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Compress & resize images to a reasonable max width before storing as base64. */
function compressImage(
  file: File,
  maxDim = 1000,
  quality = 0.75,
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function readFile(e: React.ChangeEvent<HTMLInputElement>, cb: (url: string) => void) {
  const f = e.target.files?.[0];
  if (!f) return;
  cb(await compressImage(f));
  e.target.value = "";
}

function GalleryEditor({
  images,
  onChange,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const setAt = (i: number, v: string) =>
    onChange(images.map((x, j) => (j === i ? v : x)));
  const removeAt = (i: number) => onChange(images.filter((_, j) => j !== i));

  return (
    <div className="rounded-md border border-line bg-panel p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <Label>Gallery overlay (1–5 images)</Label>
        <button
          onClick={() =>
            images.length < 5 && onChange([...images, ""])
          }
          disabled={images.length >= 5}
          className="font-mono text-[10px] uppercase tracking-wider text-amber underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-dim"
        >
          + image
        </button>
      </div>
      <p className="mb-2 text-[10px] leading-relaxed text-dim">
        After this cue's end time, a centered swipeable frame shows these
        images. Add up to 5.
      </p>

      {images.length === 0 ? (
        <div className="grid place-items-center rounded border border-dashed border-line2 py-3 text-[10px] text-dim">
          No images — add one below
        </div>
      ) : (
        <div className="space-y-1.5">
          {images.map((img, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {img ? (
                <img
                  src={img}
                  alt=""
                  className="h-9 w-12 shrink-0 rounded object-cover ring-1 ring-line"
                />
              ) : (
                <span className="grid h-9 w-12 shrink-0 place-items-center rounded bg-panel2 text-dim ring-1 ring-line">
                  <ImagePlus className="h-4 w-4" />
                </span>
              )}
              <input
                value={img.startsWith("data:") ? "(uploaded image)" : img}
                onChange={(e) => setAt(i, e.target.value)}
                placeholder={`Image ${i + 1} URL`}
                className={cn(inputCls, "font-mono text-[10px]")}
              />
              <label
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md border border-line bg-panel2 text-dim hover:border-amber/50 hover:text-amber"
                title={`Upload image ${i + 1}`}
              >
                <Upload className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    readFile(e, (u) => setAt(i, u))
                  }
                />
              </label>
              <button
                onClick={() => removeAt(i)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-dim hover:bg-ember/15 hover:text-ember"
                title="Remove image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================ video tab ============================ */

// revoke previous device video object URL when a new one replaces it
let deviceObjectUrl: string | null = null;

function VideoTab({
  project,
  setProject,
  toast,
}: {
  project: Project;
  setProject: Props["setProject"];
  toast: (m: string, kind?: "ok" | "warn") => void;
}) {
  const [url, setUrl] = useState(project.videoUrl);
  const [localName, setLocalName] = useState<string | null>(
    project.videoUrl.startsWith("blob:") ? "device video" : null
  );
  const isLocal = project.videoUrl.startsWith("blob:");
  const display = project.display;
  const setDisplay = (patch: Partial<Project["display"]>) =>
    setProject((p) => ({ ...p, display: { ...p.display, ...patch } }));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast("That file isn't a video", "warn");
      return;
    }
    if (deviceObjectUrl) URL.revokeObjectURL(deviceObjectUrl);
    const objectUrl = URL.createObjectURL(f);
    deviceObjectUrl = objectUrl;
    setUrl(objectUrl);
    setLocalName(f.name);
    setProject((p) => ({ ...p, videoUrl: objectUrl }));
    toast(`Loaded “${f.name}” from device`);
  };

  return (
    <div className="space-y-4">
      <SectionHead icon={Film} title="Source footage" />

      <div>
        <Label>Import from device</Label>
        <label className="group flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line2 bg-panel2/60 px-3 py-3 transition-colors hover:border-amber/50 hover:bg-amber/5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-raise text-amber ring-1 ring-line2 transition-transform group-hover:scale-105">
            <Upload className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-fg">
              {isLocal && localName ? localName : "Choose a video file"}
            </span>
            <span className="block truncate text-[11px] text-dim">
              MP4 / WebM / MOV · plays instantly in the preview
            </span>
          </span>
          <input type="file" accept="video/*" className="hidden" onChange={onFile} />
        </label>
        {isLocal && (
          <p className="mt-1.5 text-[10px] leading-relaxed text-dim">
            Local files live in this session only — paste a hosted URL below to
            keep it after a reload.
          </p>
        )}
      </div>
      <div>
        <Label>Video URL (MP4)</Label>
        <div className="flex gap-1.5">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/clip.mp4"
            className={cn(inputCls, "font-mono text-xs")}
          />
          <button
            onClick={() => {
              if (!url.trim()) return;
              setProject((p) => ({ ...p, videoUrl: url.trim() }));
              toast("Video source updated");
            }}
            className="shrink-0 rounded-md bg-amber px-3 text-xs font-bold text-black transition hover:brightness-110"
          >
            Apply
          </button>
        </div>
      </div>
      <div>
        <Label>Sample clips</Label>
        <div className="grid gap-1.5">
          {SAMPLE_VIDEOS.map((s) => (
            <button
              key={s.url}
              onClick={() => {
                setUrl(s.url);
                setProject((p) => ({ ...p, videoUrl: s.url }));
                toast(`Loaded “${s.label}”`);
              }}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs transition-colors",
                project.videoUrl === s.url
                  ? "border-amber/50 bg-amber/10 text-amber"
                  : "border-line bg-panel2 text-mut hover:border-line2 hover:text-fg"
              )}
            >
              <span className="flex items-center gap-2">
                <Clapperboard className="h-3.5 w-3.5" /> {s.label}
              </span>
              {project.videoUrl === s.url && <span className="text-[10px]">active</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-line pt-4">
        <SectionHead icon={PanelsTopLeft} title="Output frame" />
        <p className="mt-2 text-[11px] leading-relaxed text-dim">
          Choose the free output canvas size. Original follows the video's own
          dimensions; turning the player rotates the video and every interactive panel together.
        </p>
        <div className="mt-3">
          <Label>Aspect ratio</Label>
          <select
            value={display.aspectRatio}
            onChange={(e) => setDisplay({ aspectRatio: e.target.value as AspectRatioPreset })}
            className={cn(inputCls, "font-mono text-xs")}
            aria-label="Output aspect ratio"
          >
            {(Object.keys(ASPECT_RATIO_LABELS) as AspectRatioPreset[]).map((ratio) => (
              <option key={ratio} value={ratio}>
                {ASPECT_RATIO_LABELS[ratio]}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <Label>Rotate entire player</Label>
          <select
            value={display.rotation}
            onChange={(e) => setDisplay({ rotation: Number(e.target.value) as Rotation })}
            className={cn(inputCls, "font-mono text-xs")}
            aria-label="Rotate entire player"
          >
            {ROTATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[10px] leading-relaxed text-dim">
            Rotation is saved in the project and carried into the standalone ZIP export.
          </p>
        </div>
      </div>
      <p className="rounded-md border border-line bg-panel2/60 p-2.5 text-[11px] leading-relaxed text-dim">
        Use a direct <span className="font-mono text-mut">.mp4</span> link. Cue
        times, card ranges and the scrub slider all map onto this clip's
        duration.
      </p>
    </div>
  );
}

/* ============================ logo tab ============================ */

function LogoTab({
  project,
  setProject,
  toast,
}: {
  project: Project;
  setProject: Props["setProject"];
  toast: (m: string, kind?: "ok" | "warn") => void;
}) {
  const logo = project.logo;
  const set = (patch: Partial<Project["logo"]>) =>
    setProject((p) => ({ ...p, logo: { ...p.logo, ...patch } }));

  return (
    <div className="space-y-4">
      <SectionHead icon={Hexagon} title="Brand logo" />
      <Seg
        value={logo.mode}
        options={[
          { v: "text", label: "Text" },
          { v: "image", label: "Image" },
        ]}
        onChange={(m) => set({ mode: m })}
      />

      {logo.mode === "text" ? (
        <>
          <div>
            <Label>Brand name</Label>
            <input
              value={logo.text}
              onChange={(e) => set({ text: e.target.value })}
              className={inputCls}
              placeholder="Propwalk"
            />
          </div>
          <div>
            <Label>Tagline</Label>
            <input
              value={logo.tagline}
              onChange={(e) => set({ tagline: e.target.value })}
              className={inputCls}
              placeholder="by Cue Studio"
            />
          </div>
        </>
      ) : (
        <div>
          <Label>Logo image</Label>
          <div className="flex items-center gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line2 bg-panel2 py-3 text-xs text-mut transition-colors hover:border-amber/50 hover:text-amber">
              <Upload className="h-4 w-4" /> Upload PNG / SVG
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  readFile(e, (dataUrl) => {
                    set({ image: dataUrl });
                    toast("Logo uploaded");
                  })
                }
              />
            </label>
          </div>
          {logo.image && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-line bg-panel2 p-2">
              <img src={logo.image} alt="" className="h-8 w-auto object-contain" />
              <button
                onClick={() => set({ image: "" })}
                className="ml-auto text-dim hover:text-ember"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div>
        <Label>Position</Label>
        <Seg
          value={logo.position}
          options={[
            { v: "top-left", label: "Top left" },
            { v: "top-right", label: "Top right" },
          ]}
          onChange={(v) => set({ position: v })}
        />
      </div>

      <div>
        <Label>Opacity · {logo.opacity}%</Label>
        <input
          type="range"
          min={10}
          max={100}
          value={logo.opacity}
          onChange={(e) => set({ opacity: Number(e.target.value) })}
          className="mini-range w-full"
        />
      </div>
      <div>
        <Label>Size · {logo.size}%</Label>
        <input
          type="range"
          min={60}
          max={140}
          value={logo.size}
          onChange={(e) => set({ size: Number(e.target.value) })}
          className="mini-range w-full"
        />
      </div>
    </div>
  );
}

/* ============================ buttons tab ============================ */

function ButtonsTab({
  project,
  setProject,
  player,
  toast,
}: {
  project: Project;
  setProject: Props["setProject"];
  player: Player;
  toast: (m: string, kind?: "ok" | "warn") => void;
}) {
  const update = (id: string, patch: Partial<CueButton>) =>
    setProject((p) => ({
      ...p,
      buttons: p.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));

  const add = () => {
    const t = Math.round(player.time * 10) / 10;
    setProject((p) => ({
      ...p,
      buttons: [
        ...p.buttons,
        {
          id: uid(),
          label: `Cue ${p.buttons.length + 1}`,
          icon: "play",
          start: t,
          end: Math.min(t + 5, Math.round((player.duration || t + 5) * 10) / 10),
          color: PALETTE[p.buttons.length % PALETTE.length],
        },
      ],
    }));
    toast(`Cue added at ${fmtTime(t)}`);
  };

  const updateGroup = (id: string, patch: Partial<CueGroup>) =>
    setProject((p) => ({
      ...p,
      cueGroups: p.cueGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));

  const addGroup = () => {
    const t = Math.round(player.time * 10) / 10;
    setProject((p) => ({
      ...p,
      cueGroups: [
        ...p.cueGroups,
        {
          id: uid(),
          label: `Menu ${p.cueGroups.length + 1}`,
          icon: "layers",
          side: p.cueGroups.length % 2 === 0 ? "right" : "left",
          color: PALETTE[p.cueGroups.length % PALETTE.length],
          subCues: [
            {
              id: uid(),
              label: "Sub cue 1",
              icon: "play",
              start: t,
              end: Math.round(Math.min(t + 5, player.duration || t + 5) * 10) / 10,
              color: PALETTE[p.cueGroups.length % PALETTE.length],
            },
          ],
        },
      ],
    }));
    toast(`Dropdown cue added at ${fmtTime(t)}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHead icon={MousePointerClick} title="Cue buttons" />
        <button
          onClick={add}
          className="flex items-center gap-1.5 rounded-md bg-amber px-2.5 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-dim">
        Each button appears on the output bar and jumps the video to its start
        time. Give it an end time to auto-stop the segment.
      </p>

      {project.buttons.length === 0 && (
        <EmptyState text="No cue buttons yet." />
      )}

      {project.buttons.map((b) => {
        const Icon = ICONS[b.icon];
        return (
          <div
            key={b.id}
            className="anim-fade-up rounded-lg border border-line bg-panel2 p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md"
                style={{ background: `${b.color}22`, color: b.color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <input
                value={b.label}
                onChange={(e) => update(b.id, { label: e.target.value })}
                className={cn(inputCls, "flex-1 font-semibold uppercase tracking-wider")}
              />
              <button
                onClick={() => {
                  setProject((p) => ({
                    ...p,
                    buttons: p.buttons.filter((x) => x.id !== b.id),
                  }));
                  toast("Cue removed");
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-dim transition-colors hover:bg-ember/15 hover:text-ember"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-2">
              <Label>Icon</Label>
              <select
                value={b.icon}
                onChange={(e) => update(b.id, { icon: e.target.value as CueButton["icon"] })}
                className={cn(inputCls, "text-xs")}
              >
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <TimeField
                label="Start (s)"
                value={b.start}
                onChange={(v) => update(b.id, { start: v ?? 0 })}
                onSnap={() => update(b.id, { start: Math.round(player.time * 10) / 10 })}
              />
              {b.end != null ? (
                <TimeField
                  label="End (s)"
                  value={b.end}
                  onChange={(v) => update(b.id, { end: v })}
                  onSnap={() => update(b.id, { end: Math.round(player.time * 10) / 10 })}
                />
              ) : (
                <div className="flex-1">
                  <Label>End</Label>
                  <div className="grid h-[30px] place-items-center rounded-md border border-dashed border-line2 text-[10px] text-dim">
                    plays to end
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <Swatches value={b.color} onChange={(c) => update(b.id, { color: c })} />
              <button
                onClick={() =>
                  update(b.id, { end: b.end == null ? Math.round((b.start + 5) * 10) / 10 : null })
                }
                className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-dim underline-offset-2 hover:text-amber hover:underline"
              >
                {b.end == null ? "+ end" : "no end"}
              </button>
            </div>

            <div className="mt-2">
              <GalleryEditor
                images={b.gallery ?? []}
                onChange={(gallery) => update(b.id, { gallery })}
              />
            </div>
          </div>
        );
      })}

      {/* ----- dropdown cue groups ----- */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between">
          <SectionHead icon={PanelsTopLeft} title="Dropdown cues" />
          <button
            onClick={addGroup}
            className="flex items-center gap-1.5 rounded-md bg-amber px-2.5 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-dim">
          Corner menus open a glass panel with sub-cues. Each sub-cue plays its
          own assigned range.
        </p>

        {project.cueGroups.length === 0 && <EmptyState text="No dropdown cues yet." />}

        {project.cueGroups.map((group) => (
          <div key={group.id} className="anim-fade-up mb-3 rounded-lg border border-line bg-panel2 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: group.color }} />
              <input
                value={group.label}
                onChange={(e) => updateGroup(group.id, { label: e.target.value })}
                className={cn(inputCls, "flex-1 font-semibold")}
                placeholder="Explore scenes"
              />
              <button
                onClick={() => {
                  setProject((p) => ({
                    ...p,
                    cueGroups: p.cueGroups.filter((g) => g.id !== group.id),
                  }));
                  toast("Dropdown cue removed");
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-dim hover:bg-ember/15 hover:text-ember"
                title="Delete dropdown"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <div className="flex-1">
                <Label>Place in</Label>
                <Seg
                  value={group.side}
                  options={[
                    { v: "left", label: "Left corner" },
                    { v: "right", label: "Right corner" },
                  ]}
                  onChange={(v) => updateGroup(group.id, { side: v })}
                />
              </div>
              <div className="w-24">
                <Label>Color</Label>
                <Swatches
                  value={group.color}
                  onChange={(color) => updateGroup(group.id, { color })}
                />
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <Label>Sub-cues</Label>
              <button
                onClick={() => {
                  const t = Math.round(player.time * 10) / 10;
                  updateGroup(group.id, {
                    subCues: [
                      ...group.subCues,
                      {
                        id: uid(),
                        label: `Sub cue ${group.subCues.length + 1}`,
                        icon: "play",
                        start: t,
                        end: Math.round(Math.min(t + 5, player.duration || t + 5) * 10) / 10,
                        color: PALETTE[group.subCues.length % PALETTE.length],
                      },
                    ],
                  });
                }}
                className="font-mono text-[10px] uppercase tracking-wider text-amber hover:text-white"
              >
                + add sub-cue
              </button>
            </div>

            <div className="space-y-2">
              {group.subCues.map((cue) => (
                <div key={cue.id} className="rounded-md border border-line bg-panel p-2">
                  <div className="mb-2 flex items-center gap-1.5">
                    <input
                      value={cue.label}
                      onChange={(e) =>
                        updateGroup(group.id, {
                          subCues: group.subCues.map((c) =>
                            c.id === cue.id ? { ...c, label: e.target.value } : c
                          ),
                        })
                      }
                      className={cn(inputCls, "flex-1 text-xs")}
                      placeholder="Sub cue label"
                    />
                    <button
                      onClick={() =>
                        updateGroup(group.id, {
                          subCues: group.subCues.filter((c) => c.id !== cue.id),
                        })
                      }
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-dim hover:bg-ember/15 hover:text-ember"
                      title="Delete sub-cue"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mb-2">
                    <Label>Icon</Label>
                    <select
                      value={cue.icon}
                      onChange={(e) =>
                        updateGroup(group.id, {
                          subCues: group.subCues.map((c) =>
                            c.id === cue.id
                              ? { ...c, icon: e.target.value as CueButton["icon"] }
                              : c
                          ),
                        })
                      }
                      className={cn(inputCls, "text-xs")}
                    >
                      {ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <TimeField
                      label="Start (s)"
                      value={cue.start}
                      onChange={(v) =>
                        updateGroup(group.id, {
                          subCues: group.subCues.map((c) =>
                            c.id === cue.id ? { ...c, start: v ?? 0 } : c
                          ),
                        })
                      }
                      onSnap={() =>
                        updateGroup(group.id, {
                          subCues: group.subCues.map((c) =>
                            c.id === cue.id
                              ? { ...c, start: Math.round(player.time * 10) / 10 }
                              : c
                          ),
                        })
                      }
                    />
                    <TimeField
                      label="End (s)"
                      value={cue.end}
                      onChange={(v) =>
                        updateGroup(group.id, {
                          subCues: group.subCues.map((c) =>
                            c.id === cue.id ? { ...c, end: v ?? cue.start + 1 } : c
                          ),
                        })
                      }
                      onSnap={() =>
                        updateGroup(group.id, {
                          subCues: group.subCues.map((c) =>
                            c.id === cue.id
                              ? { ...c, end: Math.round(player.time * 10) / 10 }
                              : c
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="mt-2">
                    <GalleryEditor
                      images={cue.gallery ?? []}
                      onChange={(gallery) =>
                        updateGroup(group.id, {
                          subCues: group.subCues.map((c) =>
                            c.id === cue.id ? { ...c, gallery } : c
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ cards tab ============================ */

function CardsTab({
  project,
  setProject,
  player,
  toast,
}: {
  project: Project;
  setProject: Props["setProject"];
  player: Player;
  toast: (m: string, kind?: "ok" | "warn") => void;
}) {
  const update = (id: string, patch: Partial<InfoCard>) =>
    setProject((p) => ({
      ...p,
      cards: p.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));

  const updateLink = (id: string, patch: Partial<LinkCard>) =>
    setProject((p) => ({
      ...p,
      links: p.links.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));

  const addLink = () => {
    const t = Math.round(player.time * 10) / 10;
    setProject((p) => ({
      ...p,
      links: [
        ...p.links,
        {
          id: uid(),
          label: "Open link",
          url: "https://",
          start: t,
          end: Math.round(Math.min(t + 6, player.duration || t + 6) * 10) / 10,
          corner: "bottom-left",
          color: PALETTE[p.links.length % PALETTE.length],
        },
      ],
    }));
    toast(`Link popup added at ${fmtTime(t)}`);
  };

  const add = () => {
    const t = Math.round(player.time * 10) / 10;
    setProject((p) => ({
      ...p,
      cards: [
        ...p.cards,
        {
          id: uid(),
          title: "2BHK",
          subtitle: `U${String(p.cards.length + 1).padStart(3, "0")}`,
          body: "Describe this unit, view or amenity.",
          cta: "Explore",
          image: "",
          start: t,
          end: Math.round(Math.min(t + 6, (player.duration || t + 6)) * 10) / 10,
          side: p.cards.length % 2 === 0 ? "left" : "right",
          accent: PALETTE[p.cards.length % 3],
        },
      ],
    }));
    toast(`Card added at ${fmtTime(t)}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHead icon={PanelsTopLeft} title="Info cards" />
        <button
          onClick={add}
          className="flex items-center gap-1.5 rounded-md bg-amber px-2.5 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-dim">
        Cards pop onto the screen while the playhead is inside their time range.
      </p>

      {project.cards.length === 0 && <EmptyState text="No info cards yet." />}

      {project.cards.map((c) => (
        <div key={c.id} className="anim-fade-up rounded-lg border border-line bg-panel2 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: c.accent }}
            />
            <input
              value={c.title}
              onChange={(e) => update(c.id, { title: e.target.value })}
              className={cn(inputCls, "w-20 flex-none font-bold")}
              placeholder="3BHK"
            />
            <input
              value={c.subtitle}
              onChange={(e) => update(c.id, { subtitle: e.target.value })}
              className={cn(inputCls, "flex-1 text-ember")}
              placeholder="A302"
            />
            <button
              onClick={() => {
                setProject((p) => ({ ...p, cards: p.cards.filter((x) => x.id !== c.id) }));
                toast("Card removed");
              }}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-dim hover:bg-ember/15 hover:text-ember"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mb-2">
            <Label>Body</Label>
            <textarea
              value={c.body}
              onChange={(e) => update(c.id, { body: e.target.value })}
              rows={2}
              className={cn(inputCls, "resize-none text-xs")}
            />
          </div>

          <div className="mb-2 flex gap-2">
            <div className="flex-1">
              <Label>Button text</Label>
              <input
                value={c.cta}
                onChange={(e) => update(c.id, { cta: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="flex-1">
              <Label>Side</Label>
              <Seg
                value={c.side}
                options={[
                  { v: "left", label: "Left" },
                  { v: "right", label: "Right" },
                ]}
                onChange={(v) => update(c.id, { side: v })}
              />
            </div>
          </div>

          <div className="mb-2">
            <Label>Image</Label>
            <div className="flex gap-1.5">
              <input
                value={c.image.startsWith("data:") ? "(uploaded image)" : c.image}
                onChange={(e) => update(c.id, { image: e.target.value })}
                placeholder="https://…jpg"
                className={cn(inputCls, "font-mono text-[11px]")}
              />
              <label
                className="grid w-9 shrink-0 cursor-pointer place-items-center rounded-md border border-line bg-panel2 text-dim hover:border-amber/50 hover:text-amber"
                title="Upload image"
              >
                <ImagePlus className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    readFile(e, (u) => {
                      update(c.id, { image: u });
                      toast("Card image uploaded");
                    })
                  }
                />
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <TimeField
              label="Show at (s)"
              value={c.start}
              onChange={(v) => update(c.id, { start: v ?? 0 })}
              onSnap={() => update(c.id, { start: Math.round(player.time * 10) / 10 })}
            />
            <TimeField
              label="Hide at (s)"
              value={c.end}
              onChange={(v) => update(c.id, { end: v ?? c.start + 1 })}
              onSnap={() => update(c.id, { end: Math.round(player.time * 10) / 10 })}
            />
          </div>

          <div className="mt-2">
            <Swatches value={c.accent} onChange={(col) => update(c.id, { accent: col })} />
          </div>
        </div>
      ))}

      {/* ----- link popups ----- */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-2 font-display text-sm font-bold">
            <Link2 className="h-4 w-4 text-amber" /> Link popups
          </h4>
          <button
            onClick={addLink}
            className="flex items-center gap-1.5 rounded-md bg-amber px-2.5 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-dim">
          Small pills that appear at a fixed time and open a link in a new tab.
        </p>

        {project.links.length === 0 && <EmptyState text="No link popups yet." />}

        {project.links.map((l) => (
          <div key={l.id} className="anim-fade-up mb-3 rounded-lg border border-line bg-panel2 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: l.color }} />
              <input
                value={l.label}
                onChange={(e) => updateLink(l.id, { label: e.target.value })}
                className={cn(inputCls, "flex-1 font-semibold")}
                placeholder="Book a visit"
              />
              <button
                onClick={() => {
                  setProject((p) => ({ ...p, links: p.links.filter((x) => x.id !== l.id) }));
                  toast("Link popup removed");
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-dim hover:bg-ember/15 hover:text-ember"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-2">
              <Label>Opens URL</Label>
              <input
                value={l.url}
                onChange={(e) => updateLink(l.id, { url: e.target.value })}
                className={cn(inputCls, "font-mono text-[11px]")}
                placeholder="https://…"
              />
            </div>

            <div className="mb-2 flex gap-2">
              <TimeField
                label="Show at (s)"
                value={l.start}
                onChange={(v) => updateLink(l.id, { start: v ?? 0 })}
                onSnap={() => updateLink(l.id, { start: Math.round(player.time * 10) / 10 })}
              />
              <TimeField
                label="Hide at (s)"
                value={l.end}
                onChange={(v) => updateLink(l.id, { end: v ?? l.start + 1 })}
                onSnap={() => updateLink(l.id, { end: Math.round(player.time * 10) / 10 })}
              />
            </div>

            <div className="mb-2">
              <Label>Corner</Label>
              <select
                value={l.corner}
                onChange={(e) => updateLink(l.id, { corner: e.target.value as LinkCard["corner"] })}
                className={cn(inputCls, "text-xs")}
              >
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </div>

            <div className="mb-2">
              <Label>Icon</Label>
              <select
                value={l.icon || ""}
                onChange={(e) => updateLink(l.id, { icon: (e.target.value || undefined) as LinkCard["icon"] })}
                className={cn(inputCls, "text-xs")}
              >
                <option value="">Default (link)</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
                <option value="chat">Chat</option>
                <option value="contact">Contact</option>
                <option value="location">Location</option>
                <option value="map">Map</option>
              </select>
            </div>

            <Swatches value={l.color} onChange={(col) => updateLink(l.id, { color: col })} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ slider tab ============================ */

function Switch({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-panel2 px-3 py-2.5">
      <span className="text-sm text-mut">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          value ? "bg-amber" : "bg-line2"
        )}
        aria-label={label}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
            value ? "left-[18px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

function SliderTab({
  project,
  setProject,
  player,
}: {
  project: Project;
  setProject: Props["setProject"];
  player: Player;
}) {
  const s = project.slider;
  const set = (patch: Partial<Project["slider"]>) =>
    setProject((p) => ({ ...p, slider: { ...p.slider, ...patch } }));
  const setInfo = (patch: Partial<Project["info"]>) =>
    setProject((p) => ({ ...p, info: { ...p.info, ...patch } }));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const snap = () => Math.round(player.time * 10) / 10;

  return (
    <div className="space-y-4">
      <SectionHead icon={SlidersHorizontal} title="Top scrub slider" />
      <Switch
        value={s.enabled}
        onChange={(v) => set({ enabled: v })}
        label="Show slider on output"
      />

      <p className="text-[11px] leading-relaxed text-dim">
        Dragging the slider on the output scrubs the video{" "}
        <span className="text-mut">frame by frame</span>. Pick what the label
        next to it displays.
      </p>

      <div>
        <Label>Frame precision</Label>
        <select
          value={s.fps}
          onChange={(e) => set({ fps: Number(e.target.value) as FrameRate })}
          className={cn(inputCls, "font-mono text-xs")}
          aria-label="Frame rate"
        >
          {[30, 40, 50, 60].map((fps) => (
            <option key={fps} value={fps}>
              {fps} FPS
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[10px] leading-relaxed text-dim">
          Controls frame stepping and scrub precision. Video playback speed stays native.
        </p>
      </div>

      <div>
        <Label>Label mode</Label>
        <Seg
          value={s.labelMode}
          options={[
            { v: "clock", label: "Time of day" },
            { v: "timecode", label: "Timecode" },
          ]}
          onChange={(v) => set({ labelMode: v })}
        />
      </div>

      {s.labelMode === "clock" && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Label>Starts at</Label>
            <select
              value={s.clockFrom}
              onChange={(e) => set({ clockFrom: Number(e.target.value) })}
              className={inputCls}
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h % 12 === 0 ? 12 : h % 12} {h < 12 ? "AM" : "PM"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <Label>Ends at</Label>
            <select
              value={s.clockTo}
              onChange={(e) => set({ clockTo: Number(e.target.value) })}
              className={inputCls}
            >
              {hours.map((h) => (
                <option key={h} value={h}>
                  {h % 12 === 0 ? 12 : h % 12} {h < 12 ? "AM" : "PM"}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ----- scene time sections ----- */}
      <div className="border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-2 font-display text-sm font-bold">
            <SlidersHorizontal className="h-4 w-4 text-amber" /> Time sections
          </h4>
          <button
            onClick={() => {
              const t = snap();
              set({
                sceneMode: true,
                scenes: [
                  ...(s.scenes ?? []),
                  {
                    id: uid(),
                    label: `Scene ${(s.scenes?.length ?? 0) + 1}`,
                    start: t,
                    end: Math.round(Math.min(t + 8, player.duration || t + 8) * 10) / 10,
                    color: PALETTE[(s.scenes?.length ?? 0) % PALETTE.length],
                  },
                ],
              });
            }}
            className="flex items-center gap-1.5 rounded-md bg-amber px-2.5 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <Switch
          value={s.sceneMode}
          onChange={(v) => set({ sceneMode: v })}
          label="Split scroller into scenes"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-dim">
          Each section is its own part of the video. Scrolling the mouse wheel
          over the top scroller jumps to the next or previous scene.
        </p>

        {(s.scenes ?? []).length === 0 && (
          <div className="mt-2">
            <EmptyState text="No time sections yet." />
          </div>
        )}

        {(s.scenes ?? []).map((scene) => {
          const patchScene = (patch: Partial<SliderScene>) =>
            set({
              scenes: (s.scenes ?? []).map((x) =>
                x.id === scene.id ? { ...x, ...patch } : x
              ),
            });
          return (
            <div
              key={scene.id}
              className="anim-fade-up mt-2 rounded-lg border border-line bg-panel2 p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: scene.color }}
                />
                <input
                  value={scene.label}
                  onChange={(e) => patchScene({ label: e.target.value })}
                  className={cn(inputCls, "flex-1 font-semibold")}
                  placeholder="Morning"
                />
                <button
                  onClick={() =>
                    set({ scenes: (s.scenes ?? []).filter((x) => x.id !== scene.id) })
                  }
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-dim hover:bg-ember/15 hover:text-ember"
                  title="Delete section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <TimeField
                  label="From (s)"
                  value={scene.start}
                  onChange={(v) => patchScene({ start: v ?? 0 })}
                  onSnap={() => patchScene({ start: snap() })}
                />
                <TimeField
                  label="To (s)"
                  value={scene.end}
                  onChange={(v) => patchScene({ end: v ?? scene.start + 1 })}
                  onSnap={() => patchScene({ end: snap() })}
                />
              </div>
              <div className="mt-2">
                <Swatches
                  value={scene.color}
                  onChange={(color) => patchScene({ color })}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ----- scrub window ----- */}
      <div className="border-t border-line pt-4">
        <h4 className="mb-2 flex items-center gap-2 font-display text-sm font-bold">
          <Crosshair className="h-4 w-4 text-amber" /> Start play
        </h4>
        <Switch
          value={s.autoPlay}
          onChange={(v) => set({ autoPlay: v })}
          label="Auto-play on load"
        />
        <p className="mb-2 text-[10px] leading-relaxed text-dim">
          Plays the assigned time section automatically when the scene starts.
        </p>
        <Switch
          value={s.limitEnabled}
          onChange={(v) => set({ limitEnabled: v })}
          label="Limit to assigned part"
        />
        {s.limitEnabled && (
          <>
            <p className="mt-2 text-[11px] leading-relaxed text-dim">
              The top slider and playback stay inside this assigned time
              section — useful for looping one moment of the footage.
            </p>
            <div className="mt-2 flex gap-2">
              <TimeField
                label="From (s)"
                value={s.limitStart}
                onChange={(v) => set({ limitStart: v ?? 0 })}
                onSnap={() => set({ limitStart: snap() })}
              />
              <TimeField
                label="To (s)"
                value={s.limitEnd}
                onChange={(v) => set({ limitEnd: v ?? s.limitStart + 1 })}
                onSnap={() => set({ limitEnd: snap() })}
              />
            </div>
          </>
        )}
      </div>

      {/* ----- info panel ----- */}
      <div className="border-t border-line pt-4">
        <h4 className="mb-2 flex items-center gap-2 font-display text-sm font-bold">
          <Info className="h-4 w-4 text-amber" /> Corner info panel
        </h4>
        <Switch
          value={project.info.enabled}
          onChange={(v) => setInfo({ enabled: v })}
          label="Show on the (i) button"
        />
        <div className="mt-2">
          <Label>Title</Label>
          <input
            value={project.info.title}
            onChange={(e) => setInfo({ title: e.target.value })}
            className={inputCls}
            placeholder="Aurora Heights"
          />
        </div>
        <div className="mt-2">
          <Label>Text</Label>
          <textarea
            value={project.info.body}
            onChange={(e) => setInfo({ body: e.target.value })}
            rows={3}
            className={cn(inputCls, "resize-none text-xs")}
          />
        </div>
        <div className="mt-2">
          <Label>Image</Label>
          <div className="flex gap-1.5">
            <input
              value={project.info.image.startsWith("data:") ? "(uploaded image)" : project.info.image}
              onChange={(e) => setInfo({ image: e.target.value })}
              placeholder="https://…jpg"
              className={cn(inputCls, "font-mono text-[11px]")}
            />
            <label
              className="grid w-9 shrink-0 cursor-pointer place-items-center rounded-md border border-line bg-panel2 text-dim hover:border-amber/50 hover:text-amber"
              title="Upload image"
            >
              <ImagePlus className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  readFile(e, (u) => setInfo({ image: u }))
                }
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ misc ============================ */

function SectionHead({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <h3 className="flex items-center gap-2 font-display text-sm font-bold text-fg">
      <Icon className="h-4 w-4 text-amber" /> {title}
    </h3>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-line2 py-8 text-xs text-dim">
      {text}
    </div>
  );
}
