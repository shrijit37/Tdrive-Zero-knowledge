"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { cn } from "@/components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

function formatTime(s: number): string {
  if (!isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export default function VideoPlayer({ msgId, filename }: { msgId: number; filename?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFS, setIsFS] = useState(false);
  const [showUI, setShowUI] = useState(true);

  const src = `${API_BASE}/stream/${msgId}`;

  const togglePlay = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const seek = useCallback((delta: number) => {
    const v = ref.current;
    if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    document.fullscreenElement ? document.exitFullscreen() : c.requestFullscreen();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when focused on input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(5);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlay, seek, toggleFullscreen]);

  // Auto-hide cursor
  const resetHide = useCallback(() => {
    setShowUI(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (ref.current && !ref.current.paused) setShowUI(false);
    }, 3000);
  }, []);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const obs = new MutationObserver(() => setIsFS(!!document.fullscreenElement));
    obs.observe(c, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("fullscreenchange", () => setIsFS(!!document.fullscreenElement));
    return () => {
      obs.disconnect();
      document.removeEventListener("fullscreenchange", () => setIsFS(!!document.fullscreenElement));
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-xl overflow-hidden group select-none"
      style={{ maxHeight: "70vh" }}
      onMouseMove={resetHide}
      onMouseLeave={() => ref.current && !ref.current.paused && setShowUI(false)}
    >
      <video
        ref={ref}
        src={src}
        className="w-full object-contain"
        style={{ maxHeight: "70vh" }}
        onPlay={() => { setPlaying(true); resetHide(); }}
        onPause={() => { setPlaying(false); setShowUI(true); }}
        onTimeUpdate={() => setTime(ref.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          setDuration(ref.current?.duration || 0);
          resetHide();
        }}
        onClick={togglePlay}
        playsInline
      />

      {/* Controls overlay */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pt-10 pb-3 transition-opacity duration-300",
          showUI ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Seek bar */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={time}
          onChange={(e) => {
            if (ref.current) ref.current.currentTime = Number(e.target.value);
          }}
          className="w-full h-1 accent-white cursor-pointer mb-2"
        />

        <div className="flex items-center gap-3 text-white text-xs">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Time */}
          <span className="font-mono tabular-nums opacity-80">
            {formatTime(time)} / {formatTime(duration)}
          </span>

          {filename && (
            <span className="ml-2 truncate opacity-50 hidden sm:inline">{filename}</span>
          )}

          <div className="flex-1" />

          {/* Volume */}
          <button
            onClick={() => {
              const v = ref.current;
              if (v) { v.muted = !v.muted; setMuted(!muted); }
            }}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (ref.current) { ref.current.volume = v; ref.current.muted = v === 0; setVolume(v); setMuted(v === 0); }
            }}
            className="w-16 h-1 accent-white cursor-pointer"
          />

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            {isFS ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
