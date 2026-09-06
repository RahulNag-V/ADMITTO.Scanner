import React from 'react';

interface LiquidBackgroundProps {
  intensity?: 'subtle' | 'vibrant';
  className?: string;
}

export const LiquidBackground: React.FC<LiquidBackgroundProps> = ({
  intensity = 'vibrant',
  className = '',
}) => {
  const isVibrant = intensity === 'vibrant';

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      {/* Deep Obsidian Black Base */}
      <div className="absolute inset-0 bg-[#030408]" />

      {/* Deep Dark Atmosphere Ambient Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080a14] via-[#04050a] to-[#020205]" />

      {/* Subtle Purple Nebula Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(147,51,234,0.14),transparent_60%)] pointer-events-none" />

      {/* =========================================================
          1. PRIMARY LIQUID MORPHING AURORA BLOBS (Deep & Moody)
          ========================================================= */}

      {/* Liquid Blob 1 - Indigo & Electric Violet (Top Left) */}
      <div
        className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] max-w-[750px] max-h-[750px] rounded-full liquid-blob-1"
        style={{
          background: isVibrant
            ? 'radial-gradient(circle at 40% 40%, rgba(99, 102, 241, 0.38) 0%, rgba(139, 92, 246, 0.22) 50%, transparent 75%)'
            : 'radial-gradient(circle at 40% 40%, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 50%, transparent 75%)',
        }}
      />

      {/* Liquid Blob 2 - Sunset Fuchsia & Soft Rose (Top Right) */}
      <div
        className="absolute -top-[10%] -right-[15%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full liquid-blob-2"
        style={{
          background: isVibrant
            ? 'radial-gradient(circle at 50% 50%, rgba(217, 70, 239, 0.32) 0%, rgba(244, 63, 94, 0.2) 50%, transparent 75%)'
            : 'radial-gradient(circle at 50% 50%, rgba(217, 70, 239, 0.16) 0%, rgba(244, 63, 94, 0.09) 50%, transparent 75%)',
        }}
      />

      {/* Liquid Blob 3 - Cyber Cyan & Ocean Blue (Bottom Center/Left) */}
      <div
        className="absolute -bottom-[20%] left-[15%] w-[65vw] h-[65vw] max-w-[850px] max-h-[850px] rounded-full liquid-blob-3"
        style={{
          background: isVibrant
            ? 'radial-gradient(circle at 45% 45%, rgba(6, 182, 212, 0.3) 0%, rgba(59, 130, 246, 0.2) 55%, transparent 75%)'
            : 'radial-gradient(circle at 45% 45%, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.1) 55%, transparent 75%)',
        }}
      />

      {/* Liquid Blob 4 - Warm Amber Glow (Center Right) */}
      <div
        className="absolute top-[35%] -right-[10%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] rounded-full liquid-blob-4"
        style={{
          background: isVibrant
            ? 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.22) 0%, rgba(234, 88, 12, 0.12) 50%, transparent 75%)'
            : 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.1) 0%, rgba(234, 88, 12, 0.05) 50%, transparent 75%)',
        }}
      />

      {/* =========================================================
          2. LIGHT PURPLE BLUR DOTS & ETHEREAL GLOW ORBS
          ========================================================= */}

      {/* Light Purple Blur Dot 1 - Soft Lavender Glow (Top Center-Left) */}
      <div
        className="absolute top-[10%] left-[20%] w-80 h-80 rounded-full purple-dot-float-a"
        style={{
          background: 'radial-gradient(circle, rgba(192, 132, 252, 0.48) 0%, rgba(168, 85, 247, 0.22) 45%, transparent 75%)',
          filter: 'blur(55px)',
        }}
      />

      {/* Light Purple Blur Dot 2 - Ethereal Lilac Orb (Center Right) */}
      <div
        className="absolute top-[40%] right-[16%] w-88 h-88 rounded-full purple-dot-float-b"
        style={{
          background: 'radial-gradient(circle, rgba(216, 180, 254, 0.44) 0%, rgba(192, 132, 252, 0.2) 50%, transparent 80%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Light Purple Blur Dot 3 - Pastel Purple Orb (Bottom Left) */}
      <div
        className="absolute bottom-[16%] left-[6%] w-72 h-72 rounded-full purple-dot-float-a"
        style={{
          background: 'radial-gradient(circle, rgba(216, 180, 254, 0.4) 0%, rgba(168, 85, 247, 0.18) 50%, transparent 75%)',
          filter: 'blur(50px)',
          animationDelay: '-4s',
        }}
      />

      {/* Light Purple Blur Dot 4 - Electric Orchid Halo (Bottom Right) */}
      <div
        className="absolute bottom-[8%] right-[22%] w-80 h-80 rounded-full purple-dot-float-b"
        style={{
          background: 'radial-gradient(circle, rgba(192, 132, 252, 0.4) 0%, rgba(147, 51, 234, 0.18) 55%, transparent 80%)',
          filter: 'blur(65px)',
          animationDelay: '-7s',
        }}
      />

      {/* Light Purple Blur Dot 5 - Gentle Nebula Center Dot (Direct Center) */}
      <div
        className="absolute top-[26%] left-[45%] w-64 h-64 rounded-full purple-dot-float-a"
        style={{
          background: 'radial-gradient(circle, rgba(216, 180, 254, 0.36) 0%, rgba(168, 85, 247, 0.16) 50%, transparent 75%)',
          filter: 'blur(45px)',
          animationDelay: '-11s',
        }}
      />

      {/* =========================================================
          3. SCATTERED LIGHT PURPLE GLOWING ACCENT PARTICLES
          ========================================================= */}

      {/* Small Purple Blur Dot Particle - Top Left */}
      <div
        className="absolute top-[8%] left-[12%] w-28 h-28 rounded-full purple-dot-twinkle"
        style={{
          background: 'radial-gradient(circle, rgba(233, 213, 255, 0.6) 0%, rgba(192, 132, 252, 0.28) 45%, transparent 75%)',
          filter: 'blur(16px)',
          animationDelay: '0s',
        }}
      />

      {/* Small Purple Blur Dot Particle - Upper Center */}
      <div
        className="absolute top-[22%] left-[65%] w-24 h-24 rounded-full purple-dot-twinkle"
        style={{
          background: 'radial-gradient(circle, rgba(216, 180, 254, 0.65) 0%, rgba(168, 85, 247, 0.28) 45%, transparent 75%)',
          filter: 'blur(14px)',
          animationDelay: '-2.5s',
        }}
      />

      {/* Small Purple Blur Dot Particle - Mid Left */}
      <div
        className="absolute top-[58%] left-[28%] w-32 h-32 rounded-full purple-dot-twinkle"
        style={{
          background: 'radial-gradient(circle, rgba(192, 132, 252, 0.55) 0%, rgba(147, 51, 234, 0.22) 45%, transparent 75%)',
          filter: 'blur(20px)',
          animationDelay: '-5s',
        }}
      />

      {/* Small Purple Blur Dot Particle - Lower Right */}
      <div
        className="absolute bottom-[28%] right-[12%] w-28 h-28 rounded-full purple-dot-twinkle"
        style={{
          background: 'radial-gradient(circle, rgba(233, 213, 255, 0.6) 0%, rgba(192, 132, 252, 0.25) 45%, transparent 75%)',
          filter: 'blur(18px)',
          animationDelay: '-3.8s',
        }}
      />

      {/* Small Purple Blur Dot Particle - Bottom Center */}
      <div
        className="absolute bottom-[8%] left-[42%] w-36 h-36 rounded-full purple-dot-twinkle"
        style={{
          background: 'radial-gradient(circle, rgba(216, 180, 254, 0.5) 0%, rgba(168, 85, 247, 0.22) 45%, transparent 75%)',
          filter: 'blur(22px)',
          animationDelay: '-6.2s',
        }}
      />

      {/* =========================================================
          4. AMBIENT MESH REFRACTION & DARK VIGNETTE
          ========================================================= */}

      {/* Refraction Micro-Grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Deep Dark Atmosphere Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/65 pointer-events-none" />
    </div>
  );
};
