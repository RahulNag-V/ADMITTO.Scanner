"use client";

import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";

interface CrowdCanvasProps {
  src: string;
  rows?: number;
  cols?: number;
  className?: string;
}

const CrowdCanvas = ({ src, rows = 15, cols = 7, className }: CrowdCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = {
      src,
      rows,
      cols,
    };

    const resolveAssetPath = (path: string): string => {
      if (!path) return '';
      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path;
      }
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
      const baseNoTrailing = base.endsWith('/') ? base.slice(0, -1) : base;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${baseNoTrailing}${cleanPath}`;
    };

    // UTILS
    const randomRange = (min: number, max: number) =>
      min + Math.random() * (max - min);
    const randomIndex = (array: any[]) => randomRange(0, array.length) | 0;
    const removeFromArray = (array: any[], i: number) => array.splice(i, 1)[0];
    const removeItemFromArray = (array: any[], item: any) =>
      removeFromArray(array, array.indexOf(item));
    const removeRandomFromArray = (array: any[]) =>
      removeFromArray(array, randomIndex(array));
    const getRandomFromArray = (array: any[]) => array[randomIndex(array) | 0];

    const getStageScale = (w: number) => {
      if (w < 480) return 0.28; // Small phones: ~67px wide
      if (w < 640) return 0.35; // Large phones / narrow viewports: ~84px wide
      if (w < 1024) return 0.48; // Tablets: ~115px wide
      return 0.68; // Desktops: sleek, refined crowd scale (~163px wide)
    };

    // TWEEN FACTORIES
    const resetPeep = ({ stage, peep }: { stage: any; peep: any }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      peep.scale = stage.scale || 1;
      const effectiveW = peep.width * peep.scale;
      const effectiveH = peep.height * peep.scale;

      const isMobile = stage.width < 640;
      // On mobile, elevate them by ~36px so feet walk neatly above the docked caution tape ribbon
      // On desktop, provide multi-depth vertical layering across 150px
      const offsetY = isMobile
        ? -36 - (18 * gsap.parseEase("power2.in")(Math.random()))
        : 35 - (150 * gsap.parseEase("power2.in")(Math.random()));
      const startY = stage.height - effectiveH + offsetY;
      let startX: number;
      let endX: number;

      if (direction === 1) {
        startX = -effectiveW;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + effectiveW;
        endX = 0;
        peep.scaleX = -1;
      }

      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;

      return {
        startX,
        startY,
        endX,
      };
    };

    const normalWalk = ({ peep, props }: { peep: any; props: any }) => {
      const { startX, startY, endX } = props;
      const isMobile = stage.width < 640;
      const xDuration = isMobile ? randomRange(8, 12) : randomRange(10, 16);
      const yDuration = isMobile ? 0.2 : 0.25;

      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.6, 1.3));
      tl.to(
        peep,
        {
          duration: xDuration,
          x: endX,
          ease: "none",
        },
        0,
      );
      tl.to(
        peep,
        {
          duration: yDuration,
          repeat: Math.floor(xDuration / yDuration),
          yoyo: true,
          y: startY - (isMobile ? 4 : 8),
        },
        0,
      );

      return tl;
    };

    const walks = [normalWalk];

    // TYPES
    type Peep = {
      image: HTMLImageElement;
      rect: number[];
      width: number;
      height: number;
      drawArgs: any[];
      x: number;
      y: number;
      anchorY: number;
      scaleX: number;
      scale: number;
      walk: any;
      setRect: (rect: number[]) => void;
      render: (ctx: CanvasRenderingContext2D) => void;
    };

    // FACTORY FUNCTIONS
    const createPeep = ({
      image,
      rect,
    }: {
      image: HTMLImageElement;
      rect: number[];
    }): Peep => {
      const peep: Peep = {
        image,
        rect: [],
        width: 0,
        height: 0,
        drawArgs: [],
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        scale: 1,
        walk: null,
        setRect: (rect: number[]) => {
          peep.rect = rect;
          peep.width = rect[2];
          peep.height = rect[3];
          peep.drawArgs = [peep.image, ...rect, 0, 0, peep.width, peep.height];
        },
        render: (ctx: CanvasRenderingContext2D) => {
          ctx.save();
          ctx.translate(peep.x, peep.y);
          ctx.scale(peep.scaleX * peep.scale, peep.scale);
          ctx.drawImage(
            peep.image,
            peep.rect[0],
            peep.rect[1],
            peep.rect[2],
            peep.rect[3],
            0,
            0,
            peep.width,
            peep.height,
          );
          ctx.restore();
        },
      };

      peep.setRect(rect);
      return peep;
    };

    // MAIN
    const img = document.createElement("img");
    const stage = {
      width: 0,
      height: 0,
      scale: 1,
    };

    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];

    const createPeeps = () => {
      const { rows, cols } = config;
      const { naturalWidth: width, naturalHeight: height } = img;
      const total = rows * cols;
      const rectWidth = width / rows;
      const rectHeight = height / cols;

      for (let i = 0; i < total; i++) {
        allPeeps.push(
          createPeep({
            image: img,
            rect: [
              (i % rows) * rectWidth,
              ((i / rows) | 0) * rectHeight,
              rectWidth,
              rectHeight,
            ],
          }),
        );
      }
    };

    const getMaxCrowd = (w: number) => {
      if (w < 480) return 7;
      if (w < 768) return 12;
      if (w < 1024) return 18;
      return 28;
    };

    const initCrowd = () => {
      const maxCrowd = getMaxCrowd(stage.width);
      while (availablePeeps.length && crowd.length < maxCrowd) {
        addPeepToCrowd().walk.progress(Math.random());
      }
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      const walk = getRandomFromArray(walks)({
        peep,
        props: resetPeep({
          peep,
          stage,
        }),
      }).eventCallback("onComplete", () => {
        removePeepFromCrowd(peep);
        const maxCrowd = getMaxCrowd(stage.width);
        if (crowd.length < maxCrowd) {
          addPeepToCrowd();
        }
      });

      peep.walk = walk;

      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);

      return peep;
    };

    const removePeepFromCrowd = (peep: Peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const render = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);

      crowd.forEach((peep) => {
        peep.render(ctx);
      });

      ctx.restore();
    };

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      stage.width = rect.width || canvas.clientWidth || window.innerWidth;
      stage.height = rect.height || canvas.clientHeight || (window.innerHeight * 0.9);
      stage.scale = getStageScale(stage.width);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = stage.width * dpr;
      canvas.height = stage.height * dpr;

      crowd.forEach((peep) => {
        peep.walk.kill();
      });

      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);

      initCrowd();
    };

    const init = () => {
      createPeeps();
      resize();
      gsap.ticker.add(render);
    };

    const localAssetPath = resolveAssetPath('/peeps.png');
    const primarySrc = resolveAssetPath(config.src || '/peeps.png');
    const cdnFallback = "https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png";

    let fallbackTried = false;
    img.onerror = () => {
      if (!fallbackTried) {
        fallbackTried = true;
        const nextSrc = (img.src.includes('cdn.21st.dev')) ? localAssetPath : cdnFallback;
        if (img.src !== nextSrc) {
          console.warn('Skiper39: Primary sprite failed, trying fallback:', nextSrc);
          img.src = nextSrc;
          return;
        }
      }
      console.error('Skiper39: Failed to load crowd sprite sheet.');
    };

    img.onload = () => {
      init();
    };

    img.src = primarySrc;
    if (img.complete && img.naturalWidth > 0) {
      init();
    }

    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      gsap.ticker.remove(render);
      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });
    };
  }, [src, rows, cols]);

  return (
    <canvas
      ref={canvasRef}
      className={className || "absolute bottom-0 h-[90vh] w-full"}
    />
  );
};

export interface Skiper39Props {
  className?: string;
  canvasClassName?: string;
  src?: string;
  rows?: number;
  cols?: number;
  showTitle?: boolean;
}

const Skiper39: React.FC<Skiper39Props> = ({
  className,
  canvasClassName,
  src = "https://cdn.21st.dev/assets/localized/abdb8990a7bef8c2f5af3e45f0a3c969c4b0603fba8be92e81347de4ea4e1ed7.png",
  rows = 15,
  cols = 7,
  showTitle = true,
}) => {
  return (
    <div className={className || "relative h-full w-full bg-white text-black"}>
      {showTitle && (
        <div className="top-22 absolute left-1/2 grid -translate-x-1/2 content-start justify-items-center gap-6 text-center text-black">
          <span className="relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-white after:to-black after:content-['']">
            Croud Canvas
          </span>
        </div>
      )}
      <div className="absolute bottom-0 h-full w-full overflow-hidden">
        <CrowdCanvas
          src={src}
          rows={rows}
          cols={cols}
          className={canvasClassName}
        />
      </div>
    </div>
  );
};

export { CrowdCanvas, Skiper39 };
export default Skiper39;

/**
 * Skiper 39 Canvas_Landing_004 — React + Canvas
 * Inspired by and adapted from https://codepen.io/zadvorsky/pen/xxwbBQV
 * illustration by https://www.openpeeps.com/
 * We respect the original creators. This is an inspired rebuild with our own taste and does not claim any ownership.
 * These animations aren’t associated with the codepen.io . They’re independent recreations meant to study interaction design
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Feedback and contributions are welcome.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
