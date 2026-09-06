import React, { useState, useEffect, useRef } from 'react';
import { Compass, ShieldCheck, Zap } from 'lucide-react';
import { AppLogo } from './AppLogo';

export const Watermark3DGyroBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isSensorActive, setIsSensorActive] = useState(false);

  // 1. Ultra-Responsive Gyroscope Lerp (0.28) + Ambient Drift
  useEffect(() => {
    let animationFrameId: number;
    let startTime = Date.now();

    const updateRotation = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      // Subtle ambient 3D breathing when at rest
      const ambientX = !isSensorActive ? Math.sin(elapsed * 1.5) * 5 : 0;
      const ambientY = !isSensorActive ? Math.cos(elapsed * 1.2) * 7 : 0;

      setRotation((prev) => {
        const finalTargetX = (Number.isFinite(targetRotation.x) ? targetRotation.x : 0) + ambientX;
        const finalTargetY = (Number.isFinite(targetRotation.y) ? targetRotation.y : 0) + ambientY;
        const prevX = Number.isFinite(prev.x) ? prev.x : 0;
        const prevY = Number.isFinite(prev.y) ? prev.y : 0;

        const dx = finalTargetX - prevX;
        const dy = finalTargetY - prevY;

        return {
          x: prevX + dx * 0.28,
          y: prevY + dy * 0.28,
        };
      });

      // Ambient glare shimmer when gyro is not active
      if (!isSensorActive) {
        setGlarePosition({
          x: 50 + Math.sin(elapsed * 1.2) * 35,
          y: 50 + Math.cos(elapsed * 1.5) * 35,
        });
      }

      animationFrameId = requestAnimationFrame(updateRotation);
    };

    animationFrameId = requestAnimationFrame(updateRotation);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetRotation, isSensorActive]);

  // 2. Pure Hardware Gyroscope & Accelerometer Listener (High Sensitivity)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      const handleOrientation = (e: DeviceOrientationEvent) => {
        try {
          const beta = e.beta;
          const gamma = e.gamma;

          if (typeof beta === 'number' && typeof gamma === 'number' && (beta !== 0 || gamma !== 0)) {
            setIsSensorActive(true);

            // Ultra-Sensitive Gyro Mapping (High Gain)
            const clampedGamma = Math.max(-30, Math.min(30, gamma));
            const clampedBeta = Math.max(10, Math.min(65, beta)) - 38;

            const rotY = (clampedGamma / 22) * 38;
            const rotX = -(clampedBeta / 16) * 32;

            setTargetRotation({
              x: Number.isFinite(rotX) ? Math.max(-35, Math.min(35, rotX)) : 0,
              y: Number.isFinite(rotY) ? Math.max(-42, Math.min(42, rotY)) : 0,
            });

            setGlarePosition({
              x: Math.max(5, Math.min(95, 50 + (clampedGamma / 22) * 50)),
              y: Math.max(5, Math.min(95, 50 + (clampedBeta / 16) * 50)),
            });
          }
        } catch {
          // ignore
        }
      };

      // Accelerometer Fallback via DeviceMotion (High Gain)
      const handleMotion = (e: DeviceMotionEvent) => {
        try {
          if (!isSensorActive && e.accelerationIncludingGravity) {
            const { x, y } = e.accelerationIncludingGravity;
            if (typeof x === 'number' && typeof y === 'number') {
              setIsSensorActive(true);
              const rotY = -(x / 5.0) * 36;
              const rotX = (y / 5.0) * 30;
              setTargetRotation({
                x: Number.isFinite(rotX) ? Math.max(-34, Math.min(34, rotX)) : 0,
                y: Number.isFinite(rotY) ? Math.max(-40, Math.min(40, rotY)) : 0,
              });
            }
          }
        } catch {
          // ignore
        }
      };

      window.addEventListener('deviceorientation', handleOrientation, true);
      window.addEventListener('devicemotion', handleMotion, true);

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
        window.removeEventListener('devicemotion', handleMotion, true);
      };
    } catch {
      // Sensor not permitted
    }
  }, [isSensorActive]);

  const safeRotX = Number.isFinite(rotation.x) ? rotation.x.toFixed(2) : '0';
  const safeRotY = Number.isFinite(rotation.y) ? rotation.y.toFixed(2) : '0';

  return (
    <div
      id="watermark-3d-gyro-section"
      className="relative max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-4 my-6 sm:my-10 select-none w-full"
      style={{ perspective: 850 }}
    >
      <div
        ref={containerRef}
        className="relative w-full rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 lg:p-12 transition-transform duration-75 ease-out overflow-hidden border border-white/20 bg-gradient-to-b from-[#181d3d] via-[#10142e] to-[#090c20] shadow-[0_25px_70px_-15px_rgba(99,102,241,0.45)] group"
        style={{
          transform: `rotateX(${safeRotX}deg) rotateY(${safeRotY}deg)`,
          willChange: 'transform',
        }}
      >
        {/* Dynamic Holographic Glare Shimmer Driven by Gyroscope */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-200 rounded-3xl sm:rounded-[2.5rem] opacity-50 z-20"
          style={{
            background: `radial-gradient(circle 520px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.26), rgba(99, 102, 241, 0.18) 40%, transparent 80%)`,
          }}
        />

        {/* Ambient Glow Orbs */}
        <div className="absolute -top-20 left-1/4 w-72 sm:w-96 h-40 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 w-72 sm:w-96 h-40 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Exact Card-Width 3D Background Watermark Typography with Vibrant Gradient */}
        <div className="absolute inset-x-0 sm:inset-x-0 inset-y-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
          <svg
            viewBox="0 0 1000 220"
            className="w-full h-auto max-h-full opacity-[0.14] sm:opacity-[0.18] select-none filter drop-shadow-[0_0_90px_rgba(139,92,246,0.6)]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="cardWatermarkGrad" x1="0%" y1="0%" x2="100%" y2="80%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                <stop offset="25%" stopColor="#818cf8" stopOpacity="0.9" />
                <stop offset="55%" stopColor="#c084fc" stopOpacity="0.85" />
                <stop offset="80%" stopColor="#f472b6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="cardWatermarkStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#c084fc" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <text
              x="500"
              y="120"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="215"
              fontWeight="900"
              fontFamily="'Space Grotesk', system-ui, sans-serif"
              letterSpacing="0.04em"
              fill="url(#cardWatermarkGrad)"
              stroke="url(#cardWatermarkStrokeGrad)"
              strokeWidth="2"
            >
              ADMITTO
            </text>
          </svg>
        </div>

        {/* Foreground Content Card */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
          {/* Centered Logo with Animated Glow */}
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-r from-orange-500/40 via-indigo-500/50 to-pink-500/40 rounded-full blur-xl animate-pulse" />
            <AppLogo size="lg" className="shadow-2xl shadow-orange-500/35 relative z-10" />
          </div>

          {/* Title & Tagline */}
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black font-['Space_Grotesk'] tracking-tight text-white drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
              ADMITTO
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto font-medium leading-relaxed px-2">
              Industrial Digital Token Validation & High-Throughput Gate Admission Engine
            </p>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/12 text-slate-200 text-[11px] sm:text-xs font-semibold shadow-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Atomic Check-In</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/12 text-slate-200 text-[11px] sm:text-xs font-semibold shadow-md">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Sub-50ms Optical Scan</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/12 text-slate-200 text-[11px] sm:text-xs font-semibold shadow-md">
              <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Multi-Gate Sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
