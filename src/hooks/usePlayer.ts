import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, FRAME } from "../utils/time";

export interface Player {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  time: number;
  duration: number;
  playing: boolean;
  loading: boolean;
  error: boolean;
  muted: boolean;
  seek: (t: number, play?: boolean) => void;
  togglePlay: () => void;
  stepFrame: (dir: 1 | -1) => void;
  playSegment: (start: number, end: number | null) => void;
  setMuted: (m: boolean) => void;
  retry: () => void;
  handlers: {
    onLoadStart: () => void;
    onLoadedMetadata: () => void;
    onPlaying: () => void;
    onPause: () => void;
    onWaiting: () => void;
    onCanPlay: () => void;
    onError: () => void;
    onEnded: () => void;
  };
}

export function usePlayer(): Player {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [muted, setMuted] = useState(false);
  const segEnd = useRef<number | null>(null);

  // smooth rAF clock for playhead, cards and segment auto-stop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const v = videoRef.current;
      if (v) {
        setTime(v.currentTime);
        if (
          segEnd.current != null &&
          !v.paused &&
          v.currentTime >= segEnd.current - 0.01
        ) {
          v.pause();
          segEnd.current = null;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const seek = useCallback((t: number, play = false) => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration || 0;
    v.currentTime = clamp(t, 0, d > 0 ? d : t);
    if (play) void v.play().catch(() => {});
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.ended) v.currentTime = 0;
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const stepFrame = useCallback((dir: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    segEnd.current = null;
    v.currentTime = clamp(v.currentTime + dir * FRAME, 0, v.duration || 1e9);
  }, []);

  const playSegment = useCallback(
    (start: number, end: number | null) => {
      const v = videoRef.current;
      if (!v) return;
      segEnd.current = end;
      v.currentTime = clamp(start, 0, v.duration || start);
      void v.play().catch(() => {});
    },
    []
  );

  const retry = useCallback(() => {
    const v = videoRef.current;
    setError(false);
    setLoading(true);
    v?.load();
  }, []);

  const handlers = {
    onLoadStart: () => {
      setLoading(true);
      setError(false);
    },
    onLoadedMetadata: () => {
      const v = videoRef.current;
      if (v) setDuration(v.duration || 0);
    },
    onPlaying: () => {
      setPlaying(true);
      setLoading(false);
      setError(false);
    },
    onPause: () => setPlaying(false),
    onWaiting: () => setLoading(true),
    onCanPlay: () => {
      setLoading(false);
      setError(false);
    },
    onError: () => {
      setError(true);
      setLoading(false);
      setPlaying(false);
    },
    onEnded: () => {
      setPlaying(false);
      segEnd.current = null;
    },
  };

  return {
    videoRef,
    time,
    duration,
    playing,
    loading,
    error,
    muted,
    seek,
    togglePlay,
    stepFrame,
    playSegment,
    setMuted,
    retry,
    handlers,
  };
}
