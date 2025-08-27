import { useRef, useEffect, useState } from 'react';
import Spline from '@splinetool/react-spline';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePerformance } from './PerformanceContext';

export default function Scene() {
  const { isLite } = usePerformance();
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springX = useSpring(x, { stiffness: isLite ? 70 : 100, damping: isLite ? 18 : 20 });
  const springY = useSpring(y, { stiffness: isLite ? 70 : 100, damping: isLite ? 18 : 20 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;
      setMouse({ x: nx, y: ny });
      x.set(nx);
      y.set(ny);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [x, y]);

  // Spline tidak expose API langsung untuk manipulasi objek, jadi gunakan transform CSS pada wrapper
  const rotateY = useTransform(springX, [0, 1], isLite ? [-6, 6] : [-10, 10]);
  const rotateX = useTransform(springY, [0, 1], isLite ? [6, -6] : [10, -10]);

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        perspective: 1000,
        rotateX,
        rotateY,
        willChange: 'transform',
      }}
    >
      <Spline scene="https://prod.spline.design/s4cGOyi7p70NX4li/scene.splinecode" />
    </motion.div>
  );
}
