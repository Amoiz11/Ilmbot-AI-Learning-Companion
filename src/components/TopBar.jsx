import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

export default function TopBar({ userName, currentScreen = 'dashboard' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name || userName || 'Learner';

  const getHeaderTitle = () => {
    switch (currentScreen) {
      case 'learning-coach':
        return { title: 'Learning Coach', subtitle: 'AI Academic Tutor & Concept Guide' };
      case 'coding-coach':
        return { title: 'Coding Coach', subtitle: 'Interactive Programming & Debugging' };
      case 'smart-revision':
        return { title: 'Smart Revision', subtitle: 'Quick Revision Material & Practice Quizzes' };
      default:
        return { title: `Hello, ${displayName}`, subtitle: 'What would you like to learn today?' };
    }
  };

  const headerText = getHeaderTitle();

  const handleAvatarClick = () => {
    navigate('/profile');
  };

  return (
    <header className="top-bar">
      <div className="greeting-block">
        <h1>{headerText.title}</h1>
        <p className="greeting-subtitle">{headerText.subtitle}</p>
      </div>

      <div className="top-bar-actions">
        <Avatar
          src={user?.picture}
          name={displayName}
          size={44}
          className="user-avatar"
          title={`${displayName}'s Profile`}
          onClick={handleAvatarClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleAvatarClick();
            }
          }}
        />
      </div>
    </header>
  );
}
