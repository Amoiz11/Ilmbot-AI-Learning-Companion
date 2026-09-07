import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from './ParticleBackground';
import robotWave from '../assets/robot-wave-v2.webp';

export default function IntroScreen({ onComplete }) {
  const { authStatus } = useAuth();
  const [displayText, setDisplayText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (authStatus === 'authenticated') return;

    let animFrameId;
    let startTime = null;
    let completed = false;
    const targetText = 'ILMBOT';
    const startDelay = 520;      // ms after mount for robot entrance to settle
    const charInterval = 90;     // ms per character reveal

    const tick = (timestamp) => {
      if (completed) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      if (elapsed >= startDelay) {
        const typingElapsed = elapsed - startDelay;
        const count = Math.min(targetText.length, Math.floor(typingElapsed / charInterval) + 1);
        
        setDisplayText(targetText.slice(0, count));

        if (count >= targetText.length) {
          completed = true;
          setIsTypingDone(true);

          // Hold cleanly after typing finishes (~500ms), then trigger smooth fade-out
          setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
              if (onComplete) onComplete();
            }, 280);
          }, 500);
          return;
        }
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [authStatus, onComplete]);

  if (authStatus === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={`full-screen-container intro-screen ${isExiting ? 'fade-exit' : 'fade-enter'}`}>
      <ParticleBackground count={28} />

      <div className="intro-content-wrapper">
        <div className="intro-robot-wrapper">
          <img
            src={robotWave}
            alt="ILMBOT Intro Mascot"
            className="intro-robot-img"
            width={280}
            height={280}
            fetchPriority="high"
            decoding="async"
          />
        </div>

        <div className="intro-title-wrapper">
          <h1 className="intro-wordmark">
            {displayText}
            {displayText.length > 0 && !isTypingDone && <span className="typewriter-cursor">|</span>}
          </h1>
        </div>
      </div>
    </div>
  );
}
