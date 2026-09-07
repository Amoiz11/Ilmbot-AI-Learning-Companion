import React, { useState, useEffect } from 'react';
import './Avatar.css';

/**
 * Reusable Avatar Component with Intelligent Fallback & Aspect-Ratio Preservation
 * - Always renders inside a perfect circle.
 * - Displays image with object-fit: cover if valid.
 * - Automatically falls back to first letter of user's display name on error, empty, or missing src.
 * - Prevents layout shifts during image loading.
 */
export default function Avatar({
  src,
  name = 'User',
  size = 44,
  className = '',
  style = {},
  onClick,
  title,
  role,
  tabIndex,
  onKeyDown,
  ...rest
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Clean and validate source string
  const cleanSrc = typeof src === 'string' ? src.trim() : '';

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [cleanSrc]);

  // Extract first letter of name
  const getInitial = (displayName) => {
    if (!displayName || typeof displayName !== 'string') return 'U';
    const trimmed = displayName.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : 'U';
  };

  const initial = getInitial(name);
  const showFallback = !cleanSrc || hasError;

  const sizeStyle = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`ilmbot-avatar-container ${showFallback ? 'fallback-mode' : ''} ${className}`}
      style={{
        '--avatar-size': sizeStyle,
        width: sizeStyle,
        height: sizeStyle,
        fontSize: sizeStyle,
        ...style
      }}
      onClick={onClick}
      title={title || name}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      {...rest}
    >
      {showFallback ? (
        <span className="avatar-fallback-letter" aria-label={name}>
          {initial}
        </span>
      ) : (
        <>
          {!isLoaded && (
            <span className="avatar-loading-placeholder" aria-hidden="true">
              {initial}
            </span>
          )}
          <img
            src={cleanSrc}
            alt={name || 'User avatar'}
            className={`avatar-img ${isLoaded ? 'loaded' : 'loading'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            loading="lazy"
            decoding="async"
          />
        </>
      )}
    </div>
  );
}
