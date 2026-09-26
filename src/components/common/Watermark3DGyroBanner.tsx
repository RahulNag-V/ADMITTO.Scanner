import React, { useState, useEffect, useRef } from 'react';
import { Compass, ShieldCheck, Zap } from 'lucide-react';
import { AppLogo } from './AppLogo';

export const Watermark3DGyroBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0 });
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isSensorActive, setIsSensorActive] = useState(false);

  // 1. Smooth, Gentle 3D Lerp (0.10) + Soft Ambient Drift
  useEffect(() => {
    let animationFrameId: number;
    const startTime = Date.now();

    const updateRotation = () => {
      const elapsed = (Date.now() - startTime) / 1000;

      // Soft ambient 3D breathing when at rest (subtle and calm: max ~1.2° - 1.5°)
      const ambientX = !isSensorActive ? Math.sin(elapsed * 0.8) * 1.2 : 0;
      const ambientY = !isSensorActive ? Math.cos(elapsed * 0.6) * 1.6 : 0;

      setRotation((prev) => {
        const finalTargetX = (Number.isFinite(targetRotation.x) ? targetRotation.x : 0) + ambientX;
        const finalTargetY = (Number.isFinite(targetRotation.y) ? targetRotation.y : 0) + ambientY;
        const prevX = Number.isFinite(prev.x) ? prev.x : 0;
        const prevY = Number.isFinite(prev.y) ? prev.y : 0;

        const dx = finalTargetX - prevX;
        const dy = finalTargetY - prevY;

        // Gentle, fluid easing (0.10) prevents jitter or hypersensitive snapping
        return {
          x: prevX + dx * 0.10,
          y: prevY + dy * 0.10,
        };
      });

      // Ambient glare shimmer when gyro/hover is not active
      if (!isSensorActive) {
        setGlarePosition({
          x: 50 + Math.sin(elapsed * 0.7) * 20,
          y: 50 + Math.cos(elapsed * 0.9) * 20,
        });
      }

      animationFrameId = requestAnimationFrame(updateRotation);
    };

    animationFrameId = requestAnimationFrame(updateRotation);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetRotation, isSensorActive]);

  // 2. Hardware Gyroscope & Accelerometer Listener (Gentle, Low-Gain Sensitivity)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      const handleOrientation = (e: DeviceOrientationEvent) => {
        try {
          const beta = e.beta;
          const gamma = e.gamma;

          if (typeof beta === 'number' && typeof gamma === 'number' && (beta !== 0 || gamma !== 0)) {
            setIsSensorActive(true);

            // Gentle Gyro Mapping (Capped at subtle ±5° to ±7°)
            const clampedGamma = Math.max(-25, Math.min(25, gamma));
            const clampedBeta = Math.max(15, Math.min(65, beta)) - 40;

            const rotY = (clampedGamma / 25) * 6.5;
            const rotX = -(clampedBeta / 25) * 4.5;

            setTargetRotation({
              x: Number.isFinite(rotX) ? Math.max(-5, Math.min(5, rotX)) : 0,
              y: Number.isFinite(rotY) ? Math.max(-7, Math.min(7, rotY)) : 0,
            });

            setGlarePosition({
              x: Math.max(15, Math.min(85, 50 + (clampedGamma / 25) * 35)),
              y: Math.max(15, Math.min(85, 50 + (clampedBeta / 25) * 35)),
            });
          }
        } catch {
          // ignore
        }
      };

      // Accelerometer Fallback via DeviceMotion (Gentle, Low Gain)
      const handleMotion = (e: DeviceMotionEvent) => {
        try {
          if (!isSensorActive && e.accelerationIncludingGravity) {
            const { x, y } = e.accelerationIncludingGravity;
            if (typeof x === 'number' && typeof y === 'number') {
              setIsSensorActive(true);
              const rotY = -(x / 9.8) * 5;
              const rotX = (y / 9.8) * 3.5;
              setTargetRotation({
                x: Number.isFinite(rotX) ? Math.max(-4, Math.min(4, rotX)) : 0,
                y: Number.isFinite(rotY) ? Math.max(-6, Math.min(6, rotY)) : 0,
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

  // 3. Smooth, Gentle Desktop Mouse Hover Tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const normX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to +0.5
    const normY = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to +0.5

    // Subtle, luxurious tilt: max ~5° on Y, ~4° on X
    setTargetRotation({
      x: -normY * 6,
      y: normX * 8,
    });

    setGlarePosition({
      x: Math.max(10, Math.min(90, (normX + 0.5) * 100)),
      y: Math.max(10, Math.min(90, (normY + 0.5) * 100)),
    });
  };

  const handleMouseLeave = () => {
    setTargetRotation({ x: 0, y: 0 });
  };

  const safeRotX = Number.isFinite(rotation.x) ? rotation.x.toFixed(2) : '0';
  const safeRotY = Number.isFinite(rotation.y) ? rotation.y.toFixed(2) : '0';

  return (
    <div
      id="watermark-3d-gyro-section"
      className="relative max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2 my-4 select-none w-full"
      style={{ perspective: 1400 }}
    >
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full rounded-2xl p-6 sm:p-10 lg:p-12 transition-transform duration-100 ease-out overflow-hidden border border-[#314A56] bg-[#1B303A] group"
        style={{
          transform: `rotateX(${safeRotX}deg) rotateY(${safeRotY}deg)`,
          willChange: 'transform',
        }}
      >
        {/* Subtle Watermark Typography */}
        <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
          <svg
            viewBox="0 0 1000 220"
            className="w-full h-auto max-h-full opacity-15 select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <text
              x="500"
              y="120"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="215"
              fontWeight="900"
              fontFamily="Poppins, system-ui, sans-serif"
              letterSpacing="0.04em"
              fill="none"
              stroke="#314A56"
              strokeWidth="3"
            >
              ADMITTO
            </text>
          </svg>
        </div>

        {/* Foreground Content Card */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
          <div className="relative">
            <AppLogo size="lg" className="relative z-10" />
          </div>

          {/* Title & Tagline */}
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#ECEEF0]">
              ADMITTO
            </h3>

            <p className="text-xs sm:text-sm text-[#8A9BA8] max-w-lg mx-auto font-medium leading-relaxed px-2">
              Industrial Digital Token Validation & High-Throughput Gate Admission Engine
            </p>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#10232D] border border-[#314A56] text-[#ECEEF0] text-[11px] sm:text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
              <span>Atomic Check-In</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#10232D] border border-[#314A56] text-[#ECEEF0] text-[11px] sm:text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-[#FFE3A6] shrink-0" />
              <span>Sub-50ms Optical Scan</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#10232D] border border-[#314A56] text-[#ECEEF0] text-[11px] sm:text-xs font-medium">
              <Compass className="w-3.5 h-3.5 text-[#E4A0B3] shrink-0" />
              <span>Multi-Gate Sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
