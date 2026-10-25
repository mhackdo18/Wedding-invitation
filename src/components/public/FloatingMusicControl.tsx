import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

export default function FloatingMusicControl({
  musicUrl,
  autoplay = true,
  active = true,
}: {
  musicUrl: string | null;
  autoplay?: boolean;
  active?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [userStarted, setUserStarted] = useState(false);

  // Create / tear down the audio element whenever the URL changes.
  useEffect(() => {
    if (!musicUrl) return;
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.4;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [musicUrl]);

  // Start playback only once `active` flips on (envelope + door finished).
  // The preceding tap on the wax seal counts as the user gesture browsers
  // require, so playback is allowed on mobile/tablet/desktop alike.
  useEffect(() => {
    if (!musicUrl || !autoplay || !active || userStarted) return;
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;
    const start = () => {
      if (cancelled || !audioRef.current) return;
      audioRef.current
        .play()
        .then(() => {
          if (cancelled) return;
          setReady(true);
          setUserStarted(true);
        })
        .catch(() => {
          // Browser blocked autoplay — wait for an explicit user gesture.
          setReady(false);
        });
    };
    start();

    const onInteraction = () => {
      if (audioRef.current && audioRef.current.paused && !muted) {
        audioRef.current
          .play()
          .then(() => {
            setReady(true);
            setUserStarted(true);
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
  }, [musicUrl, autoplay, active, userStarted, muted]);

  // When deactivated (e.g. envelope re-opens), pause playback.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!active) {
      audio.pause();
      setReady(false);
    }
  }, [active]);

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
          setReady(true);
          setUserStarted(true);
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
      className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition hover:scale-105"
      style={{ background: 'rgba(58,46,34,0.85)', backdropFilter: 'blur(8px)', color: '#fff' }}
    >
      {muted ? <VolumeX size={20} /> : ready ? <Volume2 size={20} /> : <Music size={20} />}
      {!muted && ready && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ animation: 'pulse-ring 2s ease-out infinite', border: '2px solid rgba(255,255,255,0.3)' }}
        />
      )}
      <style>{`@keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.6); opacity: 0; } }`}</style>
    </button>
  );
}
