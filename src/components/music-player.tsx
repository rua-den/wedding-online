"use client";

import { useEffect, useRef, useState } from "react";

import type { MusicSettings } from "@/lib/music-store";

export function MusicPlayer({ settings }: { settings: MusicSettings }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!settings.enabled || !settings.src) return;
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;
    let activationListenersActive = true;

    const removeActivationListeners = () => {
      if (!activationListenersActive) return;
      activationListenersActive = false;
      window.removeEventListener("pointerdown", retryFromInteraction, true);
      window.removeEventListener("touchend", retryFromInteraction, true);
      window.removeEventListener("keydown", retryFromInteraction, true);
      window.removeEventListener("click", retryFromInteraction, true);
    };

    const tryPlay = async () => {
      try {
        await audio.play();
        if (!cancelled) {
          setPlaying(true);
          removeActivationListeners();
        }
      } catch {
        if (!cancelled) setPlaying(false);
      }
    };

    function retryFromInteraction() {
      void tryPlay();
    }

    const retryWhenReady = () => { void tryPlay(); };
    const retryWhenVisible = () => {
      if (document.visibilityState === "visible") void tryPlay();
    };

    void tryPlay();
    audio.addEventListener("canplay", retryWhenReady, { once: true });
    audio.addEventListener("loadeddata", retryWhenReady, { once: true });
    window.addEventListener("pointerdown", retryFromInteraction, { capture: true, passive: true });
    window.addEventListener("touchend", retryFromInteraction, { capture: true, passive: true });
    window.addEventListener("keydown", retryFromInteraction, true);
    window.addEventListener("click", retryFromInteraction, true);
    window.addEventListener("focus", retryWhenVisible);
    window.addEventListener("pageshow", retryWhenVisible);
    document.addEventListener("visibilitychange", retryWhenVisible);

    return () => {
      cancelled = true;
      audio.removeEventListener("canplay", retryWhenReady);
      audio.removeEventListener("loadeddata", retryWhenReady);
      removeActivationListeners();
      window.removeEventListener("focus", retryWhenVisible);
      window.removeEventListener("pageshow", retryWhenVisible);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, [settings.enabled, settings.src]);

  if (!settings.enabled || !settings.src || failed) return null;

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  const title = settings.title || "Nhạc cưới";
  return <div className="music-player">
    <audio
      ref={audioRef}
      src={settings.src}
      loop={settings.loop}
      preload="auto"
      autoPlay
      playsInline
      onPause={() => setPlaying(false)}
      onPlay={() => setPlaying(true)}
      onEnded={() => setPlaying(false)}
      onError={() => { setPlaying(false); setFailed(true); }}
    />
    <button type="button" className={playing ? "is-playing" : ""} onClick={() => void toggle()} aria-label={playing ? `Tạm dừng ${title}` : `Phát ${title}`} title={title}>
      <span aria-hidden="true">{playing ? "Ⅱ" : "♪"}</span>
      <small>{playing ? "Tạm dừng" : "Phát nhạc"}</small>
    </button>
  </div>;
}
