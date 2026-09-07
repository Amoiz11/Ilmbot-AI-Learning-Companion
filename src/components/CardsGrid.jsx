import React from 'react';
import { useNavigate } from 'react-router-dom';
import RobotMascot from './RobotMascot';

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const CARDS_DATA = [
  {
    id: 'learning-coach',
    titleLine1: 'Learning',
    titleLine2: 'Coach',
    themeClass: 'card-theme-green',
    pose: 'wave',
    glowColor: 'rgba(57, 255, 20, 0.2)',
    accentHex: '#39FF14',
    description: 'Understand concepts, solve problems and learn smarter.',
  },
  {
    id: 'coding-coach',
    titleLine1: 'Coding',
    titleLine2: 'Coach',
    themeClass: 'card-theme-teal',
    pose: 'code',
    glowColor: 'rgba(57, 255, 20, 0.2)',
    accentHex: '#39FF14',
    description: 'Master programming with interactive AI code assistance.',
  },
  {
    id: 'smart-revision',
    titleLine1: 'Smart',
    titleLine2: 'Revision',
    themeClass: 'card-theme-lime',
    pose: 'book',
    glowColor: 'rgba(57, 255, 20, 0.2)',
    accentHex: '#39FF14',
    description: 'Personalized spaced repetition and quiz practice.',
  },
  {
    id: 'profile',
    titleLine1: 'User',
    titleLine2: 'Profile',
    themeClass: 'card-theme-green',
    pose: 'smile',
    glowColor: 'rgba(57, 255, 20, 0.2)',
    accentHex: '#39FF14',
    description: 'Track your learning progress, badges and stats.',
  },
];

export default function CardsGrid({ onNavigate }) {
  const navigate = useNavigate();

  const handleCardClick = (cardId) => {
    if (onNavigate) {
      onNavigate(cardId);
    }
    navigate(`/${cardId}`);
  };

  return (
    <div className="cards-grid">
      {CARDS_DATA.map((card) => (
        <div
          key={card.id}
          className={`glass-panel feature-card ${card.themeClass}`}
          onClick={() => handleCardClick(card.id)}
        >
          <h2 className="card-title">
            {card.titleLine1} {card.titleLine2}
          </h2>

          <div className="card-robot-area">
            <RobotMascot
              pose={card.pose}
              size={230}
              glowColor={card.glowColor}
              className="card-robot-img"
              alt={`${card.titleLine1} ${card.titleLine2} Mascot`}
            />
          </div>

          <p className="card-description">{card.description}</p>

          <button className="card-arrow-btn" aria-label="Open feature">
            <ArrowRightIcon />
          </button>
        </div>
      ))}
    </div>
  );
}
