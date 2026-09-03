import { useMemo } from 'react';

interface PetalConfig {
  color: string;
  size: number;
  count: number;
  speed: number;
}

interface Petal {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  flip: number;
}

function PetalShape({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C7 4 3 9 3 14c0 4 3 8 9 8s9-4 9-8c0-5-4-10-9-12z"
        fill={color}
        opacity="0.7"
      />
      <path
        d="M12 4c-1 4-2 8-2 12 0 2 1 4 2 6 1-2 2-4 2-6 0-4-1-8-2-12z"
        fill={color}
        opacity="0.4"
      />
    </svg>
  );
}

export default function FallingPetals({ color, size, count, speed }: PetalConfig) {
  const petals = useMemo<Petal[]>(() => {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * speed,
      duration: speed + Math.random() * speed * 0.6,
      drift: (Math.random() - 0.5) * 200,
      rotate: Math.random() * 360,
      flip: Math.random() * 360,
    }));
  }, [count, speed]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes petal-fall {
          0% {
            transform: translate(0, -${size}px) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% {
            transform: translate(var(--drift), calc(100vh + ${size}px)) rotate(var(--rotate));
            opacity: 0;
          }
        }
        @keyframes petal-sway {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(var(--drift)); }
        }
      `}</style>
      {petals.map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: `-${size}px`,
            animation: `petal-fall ${p.duration}s linear ${p.delay}s infinite`,
            ['--drift' as string]: `${p.drift}px`,
            ['--rotate' as string]: `${p.rotate}deg`,
          }}
        >
          <div
            style={{
              animation: `petal-sway ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite alternate`,
              ['--drift' as string]: `${p.drift * 0.5}px`,
            }}
          >
            <PetalShape color={color} size={size} />
          </div>
        </div>
      ))}
    </div>
  );
}
