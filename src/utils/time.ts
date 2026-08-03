export const clamp = (v: number, a: number, b: number) =>
  Math.min(b, Math.max(a, v));

export function fmtTime(t: number): string {
  if (!isFinite(t) || t < 0) return "0:00";
  const s = Math.floor(t % 60);
  const m = Math.floor(t / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtClock(ratio: number, from: number, to: number): string {
  const h = from + clamp(ratio, 0, 1) * (to - from);
  let hr = Math.floor(h);
  let min = Math.round((h - hr) * 60);
  if (min === 60) {
    hr += 1;
    min = 0;
  }
  const ampm = hr >= 12 && hr < 24 ? "PM" : "AM";
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return min < 5
    ? `${h12} ${ampm}`
    : `${h12}:${min.toString().padStart(2, "0")} ${ampm}`;
}

export const FRAME = 1 / 30;
