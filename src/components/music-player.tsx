"use client";

import { useEffect, useRef, useState } from "react";

import { OPEN_INVITATION_EVENT } from "@/lib/invitation-events";
import type { MusicSettings } from "@/lib/music-store";

export function MusicPlayer({ settings }: { settings: MusicSettings }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!settings.enabled || !settings.src) return;
    const audio = audioRef.current;
    if (!audio) return;

    const play = async () => {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        // Audible autoplay may be blocked by browser policy. The "Mở thiệp"
        // user gesture dispatches OPEN_INVITATION_EVENT and retries playback.
        setPlaying(false);
      }
    };

    void play();
    const resume = () => { void play(); };
    window.addEventListener(OPEN_INVITATION_EVENT, resume);
    return () => window.removeEventListener(OPEN_INVITATION_EVENT, resume);
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
