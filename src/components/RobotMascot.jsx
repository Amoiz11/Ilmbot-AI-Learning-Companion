import React from 'react';
import robotWave from '../assets/robot-wave-v2.webp';
import robotCode from '../assets/robot-code.webp';
import robotBook from '../assets/robot-book.webp';
import robotSmile from '../assets/robot-smile.webp';

const POSE_MAP = {
  wave: robotWave,
  code: robotCode,
  book: robotBook,
  smile: robotSmile,
};

export default function RobotMascot({ 
  pose = 'wave', 
  size = 110, 
  glowColor = 'rgba(57, 255, 20, 0.2)', 
  className = '',
  style = {},
  alt = 'ILMBOT Mascot',
  loading = 'lazy'
}) {
  const imgSrc = POSE_MAP[pose] || POSE_MAP.wave;
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 110;

  const sizeStyle = size ? {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
  } : {};

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`floating-robot ${className}`}
      width={numericSize}
      height={numericSize}
      loading={loading}
      decoding="async"
      style={{
        ...sizeStyle,
        filter: `drop-shadow(0 0 8px ${glowColor})`,
        objectFit: 'contain',
        ...style
      }}
    />
  );
}
