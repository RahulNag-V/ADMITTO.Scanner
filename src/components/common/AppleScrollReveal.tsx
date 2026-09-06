import React from 'react';
import { motion } from 'motion/react';

interface AppleScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'none';
  distance?: number;
  blur?: boolean;
  scale?: boolean;
  viewportMargin?: string;
  id?: string;
}

export const AppleScrollReveal: React.FC<AppleScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  direction = 'up',
  distance = 16,
  scale = false,
  id,
}) => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: distance, x: 0 };
      case 'down':
        return { y: -distance, x: 0 };
      case 'left':
        return { x: distance, y: 0 };
      case 'right':
        return { x: -distance, y: 0 };
      case 'scale':
      case 'none':
      default:
        return { x: 0, y: 0 };
    }
  };

  const initialPos = getInitialPosition();

  return (
    <motion.div
      id={id}
      initial={{
        opacity: 0,
        x: initialPos.x,
        y: initialPos.y,
        scale: scale ? 0.98 : 1,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      }}
      viewport={{ once: true, amount: 'some', margin: '0px 0px 80px 0px' }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface AppleScrollStaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  id?: string;
}

export const AppleScrollStagger: React.FC<AppleScrollStaggerProps> = ({
  children,
  className = '',
  staggerDelay = 0.06,
  id,
}) => {
  return (
    <motion.div
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 'some', margin: '0px 0px 80px 0px' }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.02,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const AppleScrollCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}> = ({ children, className = '', id, delay = 0 }) => {
  return (
    <motion.div
      id={id}
      variants={{
        hidden: {
          opacity: 0,
          y: 16,
          scale: 0.99,
        },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.45,
            delay,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
      whileHover={{
        y: -4,
        scale: 1.008,
        transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
      }}
      className={`apple-scroll-card ${className}`}
    >
      {children}
    </motion.div>
  );
};
