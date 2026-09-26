import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';

interface AppleScrollProgressProps {
  className?: string;
  colorGradient?: string;
}

export const AppleScrollProgress: React.FC<AppleScrollProgressProps> = ({
  className = '',
  colorGradient = 'from-indigo-500 via-purple-500 to-pink-500',
}) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      id="apple-scroll-progress-container"
      className={`fixed top-0 left-0 right-0 z-[60] pointer-events-none transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      <motion.div
        id="apple-scroll-progress-bar"
        className="h-[2px] w-full bg-[#FFE3A6] origin-left"
        style={{ scaleX }}
      />
    </div>
  );
};

