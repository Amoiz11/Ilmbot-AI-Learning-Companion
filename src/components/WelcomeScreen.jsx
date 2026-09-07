import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from './ParticleBackground';

export default function WelcomeScreen({ userName, onComplete }) {
  const { user } = useAuth();
  const displayName = user?.name || userName || 'Learner';
  const [fadeState, setFadeState] = useState('fade-in');

  useEffect(() => {
    // Hold screen briefly after fade-in (~440ms), then trigger smooth fade-out
    const holdTimer = setTimeout(() => {
      setFadeState('fade-out');
    }, 440);

    // Complete full welcome sequence cleanly after ~720ms
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 720);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`full-screen-container welcome-screen ${fadeState}`}>
      <ParticleBackground count={28} />

      <div className="welcome-content-wrapper">
        <h1 className="welcome-wordmark">WELCOME, {displayName.toUpperCase()}</h1>
        <p className="welcome-subtitle">Preparing your space...</p>

        <div className="welcome-pulsing-dots">
          <span className="dot dot-1"></span>
          <span className="dot dot-2"></span>
          <span className="dot dot-3"></span>
        </div>
      </div>
    </div>
  );
}
