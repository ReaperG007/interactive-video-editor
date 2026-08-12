import { DEFAULT_DISPLAY, type Project } from "./types";

export const SAMPLE_VIDEOS = [
  {
    label: "Skyline orbit · 40s",
    url: "https://videos.pexels.com/video-files/15823193/15823193-hd_1920_1080_30fps.mp4",
  },
  {
    label: "Tower flyover · 17s",
    url: "https://videos.pexels.com/video-files/19698409/19698409-uhd_3840_2160_60fps.mp4",
  },
];

export const DEFAULT_PROJECT: Project = {
  videoUrl: SAMPLE_VIDEOS[0].url,
  display: DEFAULT_DISPLAY,
  logo: {
    mode: "text",
    text: "Propwalk",
    tagline: "by Cue Studio",
    image: "",
    position: "top-left",
    opacity: 100,
    size: 100,
  },
  slider: {
    enabled: true,
    labelMode: "clock",
    clockFrom: 8,
    clockTo: 20,
    limitEnabled: false,
    limitStart: 0,
    limitEnd: 40,
    sceneMode: true,
    autoPlay: true,
    fps: 30,
    scenes: [
      { id: "s1", label: "Morning", start: 0, end: 12, color: "#ffb224" },
      { id: "s2", label: "Midday", start: 12, end: 26, color: "#4cc3ff" },
      { id: "s3", label: "Sunset", start: 26, end: 40, color: "#ff6b4a" },
    ],
  },
  buttons: [
    { id: "b1", label: "Walk", icon: "walk", start: 0, end: 8, color: "#ffb224" },
    { id: "b2", label: "Bird", icon: "bird", start: 8, end: 16, color: "#4cc3ff" },
    { id: "b3", label: "Satellite", icon: "satellite", start: 16, end: 24, color: "#3ddc97" },
    { id: "b4", label: "Units", icon: "units", start: 24, end: 32, color: "#ff6b4a" },
    { id: "b5", label: "Gallery", icon: "gallery", start: 32, end: null, color: "#e8eaed", gallery: [
      "https://images.pexels.com/photos/6585598/pexels-photo-6585598.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      "https://images.pexels.com/photos/8135492/pexels-photo-8135492.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      "https://images.pexels.com/photos/8089172/pexels-photo-8089172.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    ] },
  ],
  cueGroups: [
    {
      id: "g1",
      label: "Explore scenes",
      icon: "layers",
      side: "right",
      color: "#ffb224",
      subCues: [
        { id: "g1a", label: "Arrival", icon: "car", start: 0, end: 8, color: "#ffb224" },
        { id: "g1b", label: "Courtyard", icon: "tree", start: 16, end: 24, color: "#3ddc97" },
        { id: "g1c", label: "Skyline", icon: "sun", start: 30, end: 38, color: "#4cc3ff" },
      ],
    },
  ],
  cards: [
    {
      id: "c1",
      title: "3BHK",
      subtitle: "A302",
      body: "Corner residence with double-height glazing and panoramic skyline views.",
      cta: "Explore",
      image:
        "https://images.pexels.com/photos/8135492/pexels-photo-8135492.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      start: 2,
      end: 10,
      side: "left",
      accent: "#ffb224",
    },
    {
      id: "c2",
      title: "2BHK",
      subtitle: "B104",
      body: "Garden-facing layout with an open kitchen and private terrace.",
      cta: "Explore",
      image:
        "https://images.pexels.com/photos/8089172/pexels-photo-8089172.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      start: 18,
      end: 26,
      side: "right",
      accent: "#4cc3ff",
    },
  ],
  links: [
    {
      id: "l1",
      label: "Book a site visit",
      url: "https://example.com/visit",
      start: 10,
      end: 20,
      corner: "bottom-left",
      color: "#3ddc97",
    },
    {
      id: "l2",
      label: "Download brochure",
      url: "https://example.com/brochure",
      start: 26,
      end: 38,
      corner: "top-right",
      color: "#ffb224",
    },
  ],
  info: {
    enabled: true,
    title: "Aurora Heights",
    body: "Four glass towers wrapped around a central courtyard — 1 to 4 BHK residences with skyline views. Tap the info button anytime to revisit this overview.",
    image:
      "https://images.pexels.com/photos/6585598/pexels-photo-6585598.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
};
