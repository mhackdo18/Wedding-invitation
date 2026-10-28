import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

export default function FloatingMusicControl({
  musicUrl,
  autoplay = true,
  active = true,
  bottomOffset = 20,
}: {
  musicUrl: string | null;
  autoplay?: boolean;
  active?: boolean;
  bottomOffset?: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  // Create / tear down the audio element whenever the URL changes.
  useEffect(() => {
    if (!musicUrl) return;
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.4;
    audioRef.current = audio;
    startedRef.current = false;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [musicUrl]);

  // Start playback once `active` flips on (wax seal pressed). After that,
  // the track loops continuously and is not interrupted by the door reveal.
  useEffect(() => {
    if (!musicUrl || !autoplay || !active || startedRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;
    const start = () => {
      if (cancelled || !audioRef.current) return;
      audioRef.current
        .play()
        .then(() => {
          if (cancelled) return;
          startedRef.current = true;
          setReady(true);
        })
        .catch(() => {
          setReady(false);
        });
    };
    start();

    const onInteraction = () => {
      if (audioRef.current && audioRef.current.paused && !muted) {
        audioRef.current
          .play()
          .then(() => {
            startedRef.current = true;
            setReady(true);
          })
          .catch(() => {});
      }
      document.removeEventListener('click', onInteraction);
      document.removeEventListener('touchstart', onInteraction);
      document.removeEventListener('keydown', onInteraction);
    };
    document.addEventListener('click', onInteraction);
    document.addEventListener('touchstart', onInteraction);
    document.addEventListener('keydown', onInteraction);

    return () => {
      cancelled = true;
      document.removeEventListener('click', onInteraction);
      document.removeEventListener('touchstart', onInteraction);
      document.removeEventListener('keydown', onInteraction);
    };
  }, [musicUrl, autoplay, active, muted]);

  if (!musicUrl) return null;

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    setMuted(next);
    audio.muted = next;
    if (!next && audio.paused) {
      audio
        .play()
        .then(() => {
          startedRef.current = true;
          setReady(true);
        })
        .catch(() => {});
    } else if (next) {
      audio.pause();
    }
  };

  return (
    <button
      onClick={toggleMute}
      aria-label={muted ? 'Unmute background music' : 'Mute background music'}
      className="fixed right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition active:scale-95"
      style={{
        bottom: bottomOffset,
        background: 'rgba(58,46,34,0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: '#fff',
      }}
    >
      {muted ? <VolumeX size={18} /> : ready ? <Volume2 size={18} /> : <Music size={18} />}
      {!muted && ready && (
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ animation: 'pulse-ring 2s ease-out infinite', border: '2px solid rgba(255,255,255,0.3)' }}
        />
      )}
      <style>{`@keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }`}</style>
    </button>
  );
}
