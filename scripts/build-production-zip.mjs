/**
 * build-production-zip.mjs
 * ------------------------
 * Generates the production export ZIP exactly the way the in-app
 * "Export ZIP" button does (see exportZip in src/App.tsx), but from
 * the command line using the default sample project.
 *
 *   bun scripts/build-production-zip.mjs
 *
 * Output: public/<slug>.zip  (served by Vite at /<slug>.zip)
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { DEFAULT_PROJECT } from "../src/defaults.ts";
import { makeStandaloneHtml } from "../src/export/standalone.ts";

// Same thresholds/helpers as src/App.tsx
const MAX_IMAGE_B64 = 90 * 1024;
const IMAGE_DATA_RE = /^data:image\/(jpeg|png|webp);base64,/;

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
Auto start          Plays the first scene / assigned part when it loads
Cue buttons         Jump to and play their assigned part
Dropdown cues       Corner menus with sub-cues
Scene chips         Sections of the top scroller (wheel or swipe to change)
Reset               Restores the very first state
Keys                Space play · arrows step frames · M mute · I info
                    R rotate · F fullscreen · 0 reset · Esc close panels
`;

function slug(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "cuewalk-project"
  );
}

function videoExtension(url, mime) {
  const fromUrl = url
    .split("?")[0]
    .split("#")[0]
    .match(/\.([a-z0-9]+)$/i)?.[1];
  if (fromUrl && ["mp4", "webm", "mov", "m4v", "ogv"].includes(fromUrl.toLowerCase())) {
    return fromUrl.toLowerCase();
  }
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("ogg")) return "ogv";
  return "mp4";
}

/** Deep-walk the project and report any base64 images that the browser
 *  would normally shrink at export time (canvas only exists in a browser). */
function findOversizedImages(project) {
  const found = [];
  const queue = [project];
  while (queue.length) {
    const node = queue.pop();
    if (Array.isArray(node)) {
      queue.push(...node);
    } else if (node && typeof node === "object") {
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (typeof value === "string") {
          if (value.length > MAX_IMAGE_B64 && IMAGE_DATA_RE.test(value)) {
            found.push(`"${key}" (${(value.length / 1024).toFixed(0)} kB)`);
          }
        } else if (value && typeof value === "object") {
          queue.push(value);
        }
      }
    }
  }
  return found;
}

const project = DEFAULT_PROJECT;

const zip = new JSZip();
const src = zip.folder("src");

let videoPath = project.videoUrl;
const isDeviceVideo =
  project.videoUrl.startsWith("blob:") || project.videoUrl.startsWith("data:video");
let videoMode = isDeviceVideo ? "bundled" : "linked";

if (isDeviceVideo) {
  // A device-uploaded video is stored as a data: URL in the project file.
  try {
    const mime = project.videoUrl.slice(5, project.videoUrl.indexOf(";"));
    const b64 = project.videoUrl.slice(project.videoUrl.indexOf(",") + 1);
    const buf = Buffer.from(b64, "base64");
    const ext = videoExtension(project.videoUrl, mime);
    videoPath = `src/video.${ext}`;
    src?.file(`video.${ext}`, buf);
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

const oversized = findOversizedImages(project);
if (oversized.length) {
  console.warn(
    `WARN: ${oversized.length} oversized embedded image(s) found that the browser would ` +
      `shrink (${oversized.join(", ")}). Re-export from the app for the smallest ZIP.`
  );
}

const exportedProject = { ...project, videoUrl: videoPath };

src?.file("project.json", JSON.stringify(exportedProject, null, 2));
zip.file("index.html", makeStandaloneHtml(exportedProject, videoMode));
zip.file("README.txt", README);

const buf = await zip.generateAsync({ type: "nodebuffer" });
const name = `${slug(project.logo.text || "cuewalk-project")}.zip`;
const outDir = path.join(process.cwd(), "public");
const outPath = path.join(outDir, name);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, buf);

const sizeMB = (buf.length / (1024 * 1024)).toFixed(2);
console.log(`✅ ${name} written (${sizeMB} MB) -> ${outPath}`);
console.log(`   mode: ${videoMode} · video: ${videoPath}`);
