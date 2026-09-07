import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../context/ConversationContext';
import TopBar from './TopBar';
import Avatar from './Avatar';
import './ProfileScreen.css';

// SVG Vector Icons
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const ZapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

const BookOpenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const FlameIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
  </svg>
);

const TargetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

const CardsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="14" height="14" rx="2"></rect>
    <path d="M17 14h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"></path>
  </svg>
);

const AwardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7"></circle>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
  </svg>
);

const HistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { user, dbUser, logout } = useAuth();
  const { setActiveConversationId } = useConversations();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [profileData, setProfileData] = useState(dbUser || null);
  const [loading, setLoading] = useState(!dbUser);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Real history datasets
  const [conversationsList, setConversationsList] = useState([]);
  const [revisionsList, setRevisionsList] = useState([]);
  const [quizzesList, setQuizzesList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch real user data from GET /users/me, analytics, and history on mount
  useEffect(() => {
    const token = localStorage.getItem('ilmbot_google_token');
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const authHeaders = {
      'Authorization': token ? `Bearer ${token}` : ''
    };

    if (!dbUser) {
      setLoading(true);
    }
    setLoadingAnalytics(true);
    setLoadingHistory(true);
    setError(null);

    // Fetch user profile, analytics, and learning history concurrently in a single parallel batch
    Promise.allSettled([
      fetch(`${apiBaseUrl}/users/me`, { headers: authHeaders }).then(r => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`${apiBaseUrl}/api/analytics/profile`, { headers: authHeaders }).then(r => r.ok ? r.json() : null),
      fetch(`${apiBaseUrl}/api/conversations`, { headers: authHeaders }).then(r => r.ok ? r.json() : []),
      fetch(`${apiBaseUrl}/api/revision/history`, { headers: authHeaders }).then(r => r.ok ? r.json() : []),
      fetch(`${apiBaseUrl}/api/revision/quiz/history`, { headers: authHeaders }).then(r => r.ok ? r.json() : [])
    ]).then(([userRes, analyticsRes, convRes, revRes, quizRes]) => {
      if (userRes.status === 'fulfilled' && userRes.value) {
        setProfileData(userRes.value);
      } else if (!dbUser) {
        setError('Unable to connect to server. Please try again.');
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalytics(analyticsRes.value);
      }
      if (convRes.status === 'fulfilled' && Array.isArray(convRes.value)) {
        setConversationsList(convRes.value);
      }
      if (revRes.status === 'fulfilled' && Array.isArray(revRes.value)) {
        setRevisionsList(revRes.value);
      }
      if (quizRes.status === 'fulfilled' && Array.isArray(quizRes.value)) {
        setQuizzesList(quizRes.value);
      }
    }).catch((err) => {
      console.error('Error in parallel profile data loading:', err);
    }).finally(() => {
      setLoading(false);
      setLoadingAnalytics(false);
      setLoadingHistory(false);
    });
  }, [dbUser]);

  // Format timestamp helper
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  // Format relative time helper for activity items
  const formatTimeAgo = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      }

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      if (isYesterday) {
        return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      }

      if (diffDays < 7) {
        return `${diffDays} days ago`;
      }

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  };

  // Active History Tab State
  const [activeHistoryTab, setActiveHistoryTab] = useState('conversations');
  const [visibleCount, setVisibleCount] = useState(5);

  const handleTabChange = (tabKey) => {
    setActiveHistoryTab(tabKey);
    setVisibleCount(5);
  };

  const getActiveData = () => {
    if (activeHistoryTab === 'revisions') {
      return revisionsList.map(r => ({
        id: r.id,
        sessionId: r.sessionId,
        title: r.title,
        coachType: r.coachType,
        module: r.module || (r.coachType === 'coding' ? 'Coding Coach' : 'Learning Coach'),
        badgeClass: r.badgeClass || (r.coachType === 'coding' ? 'badge-coding' : 'badge-learning'),
        date: formatTimeAgo(r.createdAt),
        type: 'revision'
      }));
    }
    if (activeHistoryTab === 'quizzes') {
      return quizzesList.map(q => ({
        id: q.id,
        sessionId: q.sessionId,
        title: q.title,
        coachType: q.coachType,
        module: q.module || `${q.score}/${q.totalQuestions} (${Math.round(q.percentage)}%)`,
        badgeClass: q.badgeClass || (q.coachType === 'coding' ? 'badge-coding' : 'badge-learning'),
        date: formatTimeAgo(q.createdAt),
        type: 'quiz'
      }));
    }
    return conversationsList.map(c => ({
      id: c.id,
      sessionId: c.id,
      title: c.title,
      coachType: c.coach_type,
      module: c.coach_type === 'coding' ? 'Coding Coach' : 'Learning Coach',
      badgeClass: c.coach_type === 'coding' ? 'badge-coding' : 'badge-learning',
      date: formatTimeAgo(c.updated_at || c.created_at),
      type: 'conversation'
    }));
  };

  const handleItemClick = (item) => {
    if (item.type === 'conversation') {
      if (setActiveConversationId) {
        setActiveConversationId(item.id);
      }
      navigate(item.coachType === 'coding' ? '/coding-coach' : '/learning-coach');
    } else if (item.type === 'revision') {
      if (item.sessionId) {
        navigate(`/smart-revision/${item.sessionId}`);
      } else {
        navigate('/smart-revision');
      }
    } else if (item.type === 'quiz') {
      if (item.sessionId) {
        navigate(`/smart-revision/${item.sessionId}/quiz`);
      } else {
        navigate('/smart-revision');
      }
    }
  };

  const activeDataList = getActiveData();
  const visibleDataList = activeDataList.slice(0, visibleCount);

  // User display fields from DB profileData (or client user fallback)
  const displayName = profileData?.name || user?.name || 'Learner';
  const displayEmail = profileData?.email || user?.email || '';
  const displayAvatar = profileData?.profile_picture || user?.picture;
  const createdAtFormatted = formatDate(profileData?.created_at);
  const lastLoginFormatted = formatDate(profileData?.last_login);

  return (
    <div className="profile-screen-wrapper">
      <TopBar userName={displayName} currentScreen="profile" />

      {/* Inline Error Banner */}
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '12px 16px',
          color: '#F87171',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="glass-panel profile-header-card" style={{ justifyContent: 'center', padding: '40px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500' }}>
            Loading database profile...
          </div>
        </div>
      ) : (
        /* SECTION 1 — User Info Header */
        <div className="glass-panel profile-header-card">
          <div className="profile-avatar-wrapper">
            <Avatar
              src={displayAvatar}
              name={displayName}
              size={90}
              className="profile-avatar-img"
            />
            <span className="profile-avatar-badge">✓</span>
          </div>

          <div className="profile-details-col">
            <h2 className="profile-user-name">{displayName}</h2>
            <p className="profile-user-meta">{displayEmail}</p>
            <div className="profile-tags-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
              <span className="streak-pill-tag" style={{ background: 'rgba(52, 211, 153, 0.12)', color: '#34D399', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon /> Created: {createdAtFormatted}
              </span>
              <span className="streak-pill-tag" style={{ background: 'rgba(96, 165, 250, 0.12)', color: '#60A5FA', border: '1px solid rgba(96, 165, 250, 0.25)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClockIcon /> Last Login: {lastLoginFormatted}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2 — Learning Statistics Cards */}
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <div className="stat-icon-wrapper">
            <CardsIcon />
          </div>
          <div className="stat-info-col">
            <span className="stat-number">
              {loadingAnalytics ? '—' : (analytics?.flashcardsGenerated ?? analytics?.flashcards_generated ?? 0)}
            </span>
            <span className="stat-label">Flashcards Generated</span>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-icon-wrapper">
            <CheckCircleIcon />
          </div>
          <div className="stat-info-col">
            <span className="stat-number">
              {loadingAnalytics ? '—' : (analytics?.quizAttempts ?? analytics?.quiz_attempts ?? 0)}
            </span>
            <span className="stat-label">Quiz Attempts</span>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-icon-wrapper">
            <TargetIcon />
          </div>
          <div className="stat-info-col">
            <span className="stat-number">
              {loadingAnalytics ? '—' : `${analytics?.averageScore ?? analytics?.average_score ?? 0}%`}
            </span>
            <span className="stat-label">Average Score</span>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="stat-icon-wrapper">
            <AwardIcon />
          </div>
          <div className="stat-info-col">
            <span className="stat-number">
              {loadingAnalytics ? '—' : `${analytics?.bestScore ?? analytics?.best_score ?? 0}%`}
            </span>
            <span className="stat-label">Best Score</span>
          </div>
        </div>
      </div>

      {/* SECTION 3 — Learning History */}
      <div className="glass-panel history-section-card">
        <div className="section-title-row" style={{ marginBottom: '8px' }}>
          <span className="section-title-icon"><HistoryIcon /></span>
          <h3>Learning History & Activity</h3>
        </div>

        <div className="history-tabs-bar">
          <button
            className={`history-tab-btn ${activeHistoryTab === 'conversations' ? 'active' : ''}`}
            onClick={() => handleTabChange('conversations')}
          >
            <span>Previous Conversations ({conversationsList.length})</span>
          </button>
          <button
            className={`history-tab-btn ${activeHistoryTab === 'revisions' ? 'active' : ''}`}
            onClick={() => handleTabChange('revisions')}
          >
            <span>Revision Sessions ({revisionsList.length})</span>
          </button>
          <button
            className={`history-tab-btn ${activeHistoryTab === 'quizzes' ? 'active' : ''}`}
            onClick={() => handleTabChange('quizzes')}
          >
            <span>Quiz Attempts ({quizzesList.length})</span>
          </button>
        </div>

        {loadingHistory ? (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Loading learning history...
          </div>
        ) : activeDataList.length === 0 ? (
          <div style={{
            padding: '36px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '26px' }}>📝</span>
            <span style={{ fontWeight: '500' }}>
              {activeHistoryTab === 'conversations' && 'No previous conversations found yet. Start chatting with Learning Coach or Coding Coach!'}
              {activeHistoryTab === 'revisions' && 'No revision sessions generated yet. Generate your first Smart Revision Pack from any study chat!'}
              {activeHistoryTab === 'quizzes' && 'No quiz attempts recorded yet. Test your knowledge in Smart Revision to track your quiz performance!'}
            </span>
          </div>
        ) : (
          <div className="history-list">
            {visibleDataList.map((item) => (
              <div
                key={item.id}
                className="history-item-card"
                onClick={() => handleItemClick(item)}
                style={{ cursor: 'pointer' }}
                title="Click to open"
              >
                <div className="history-item-main">
                  <span className={item.badgeClass || 'badge-learning'}>{item.module || 'Smart Revision'}</span>
                  <span className="history-item-title">{item.title}</span>
                </div>
                <span className="history-item-meta">{item.date}</span>
              </div>
            ))}

            {activeDataList.length > visibleCount && (
              <div className="show-more-wrapper">
                <button
                  type="button"
                  className="show-more-btn"
                  onClick={() => setVisibleCount(prev => prev + 5)}
                >
                  Show More ({activeDataList.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4 — Account Management */}
      <div className="account-section-grid">
        <div className="glass-panel settings-card">
          <div className="section-title-row">
            <span className="section-title-icon"><ShieldIcon /></span>
            <h3>Account Session</h3>
          </div>

          <div className="account-session-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Logged in as <strong style={{ color: '#EAFBF1' }}>{displayEmail}</strong>
            </div>

            <button
              type="button"
              className="profile-logout-btn"
              onClick={handleLogout}
              style={{ width: 'auto', minWidth: '140px', padding: '10px 22px', margin: 0 }}
            >
              <LogoutIcon />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
