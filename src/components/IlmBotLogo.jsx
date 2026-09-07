import React from 'react';
import logoImg from '../assets/logo.webp';

/**
 * IlmBotLogo — circular emblem with connected calligraphic "Bot علم" script.
 * Single clean neon-green circle border, connected flowing IlmBot script inside,
 * transparent background, rendered from the optimized WebP asset.
 */
export default function IlmBotLogo({ size = 44, className = '', showGlow = true, fetchPriority = 'auto', loading = 'lazy' }) {
  const numericSize = typeof size === 'number' ? size : parseInt(size, 10) || 44;
  const sizePx = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={logoImg}
      alt="ILMBOT Typography Emblem Logo"
      className={`ilmbot-logo-img ${className}`}
      width={numericSize}
      height={numericSize}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      style={{
        width: sizePx,
        height: sizePx,
        objectFit: 'contain',
        filter: showGlow ? 'drop-shadow(0 0 8px rgba(57, 255, 20, 0.45))' : 'none',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  );
}
