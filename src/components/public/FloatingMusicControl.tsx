import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

export default function FloatingMusicControl({ musicUrl, autoplay = true }: { musicUrl: string | null; autoplay?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!musicUrl) return;
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.4;
    audioRef.current = audio;

    if (autoplay) {
      const tryPlay = () => {
        audio.play().then(() => setReady(true)).catch(() => {
          setReady(false);
        });
      };
      tryPlay();

      const onInteraction = () => {
        if (audio.paused && !muted) {
          audio.play().then(() => setReady(true)).catch(() => {});
        }
        document.removeEventListener('click', onInteraction);
        document.removeEventListener('touchstart', onInteraction);
        document.removeEventListener('keydown', onInteraction);
      };
      document.addEventListener('click', onInteraction);
      document.addEventListener('touchstart', onInteraction);
      document.addEventListener('keydown', onInteraction);

      return () => {
        audio.pause();
        audioRef.current = null;
        document.removeEventListener('click', onInteraction);
        document.removeEventListener('touchstart', onInteraction);
        document.removeEventListener('keydown', onInteraction);
      };
    }

    // When autoplay is off, music starts muted/paused; user clicks to play
    setReady(false);
    return () => {
      audio.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicUrl, autoplay]);

  if (!musicUrl) return null;

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    setMuted(next);
    audio.muted = next;
    if (!next && audio.paused) {
      audio.play().then(() => setReady(true)).catch(() => {});
    } else if (next) {
      audio.pause();
    }
  };

  return (
    <button
      onClick={toggleMute}
      aria-label={muted ? 'Unmute background music' : 'Mute background music'}
      className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition hover:scale-105"
      style={{ background: 'rgba(58,46,34,0.85)', backdropFilter: 'blur(8px)', color: '#fff' }}
    >
      {muted ? <VolumeX size={20} /> : ready ? <Volume2 size={20} /> : <Music size={20} />}
      {!muted && ready && (
        <span className="absolute inset-0 rounded-full" style={{ animation: 'pulse-ring 2s ease-out infinite', border: '2px solid rgba(255,255,255,0.3)' }} />
      )}
      <style>{`@keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }`}</style>
    </button>
  );
}
