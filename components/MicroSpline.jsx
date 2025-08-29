"use client";
import Spline from '@splinetool/react-spline';

export default function MicroSpline({ scene, className }) {
  if (!scene) return null;
  return (
    <div className={className}>
      <Spline scene={scene} />
    </div>
  );
}
