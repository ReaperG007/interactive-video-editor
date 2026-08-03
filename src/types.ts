export type IconName =
  | "walk"
  | "bird"
  | "satellite"
  | "units"
  | "gallery"
  | "play"
  | "home"
  | "map"
  | "camera"
  | "compass"
  | "layers"
  | "tree"
  | "car"
  | "sun"
  | "star"
  | "eye";

export interface CueButton {
  id: string;
  label: string;
  icon: IconName;
  start: number;
  end: number | null; // null = play to the end of the video
  color: string;
}

export interface CueGroup {
  id: string;
  label: string;
  icon: IconName;
  side: "left" | "right";
  color: string;
  subCues: CueButton[];
}

export interface InfoCard {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  cta: string;
  image: string;
  start: number;
  end: number;
  side: "left" | "right";
  accent: string;
}

export interface LogoConfig {
  mode: "text" | "image";
  text: string;
  tagline: string;
  image: string;
  position: "top-left" | "top-right";
  opacity: number; // 0..100
  size: number; // 60..140 (%)
}

export interface SliderScene {
  id: string;
  label: string;
  start: number;
  end: number;
  color: string;
}

export interface SliderConfig {
  enabled: boolean;
  labelMode: "clock" | "timecode";
  clockFrom: number; // hour, 0..23
  clockTo: number;
  limitEnabled: boolean; // restrict scrubbing + playback to a window
  limitStart: number;
  limitEnd: number;
  sceneMode: boolean; // split the scroller into separate time sections
  scenes: SliderScene[];
}

export interface LinkCard {
  id: string;
  label: string;
  url: string;
  start: number;
  end: number;
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  color: string;
}

export interface InfoPanel {
  enabled: boolean;
  title: string;
  body: string;
  image: string;
}

export interface Project {
  videoUrl: string;
  logo: LogoConfig;
  slider: SliderConfig;
  buttons: CueButton[];
  cueGroups: CueGroup[];
  cards: InfoCard[];
  links: LinkCard[];
  info: InfoPanel;
}

export const PALETTE = [
  "#ffb224",
  "#4cc3ff",
  "#3ddc97",
  "#ff6b4a",
  "#e8eaed",
  "#f2a1c2",
];

export const uid = () => Math.random().toString(36).slice(2, 9);
