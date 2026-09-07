import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../context/ConversationContext';
import IlmBotLogo from './IlmBotLogo';

// SVG Icon components for clean vector icons
const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const BrainIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"></path>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"></path>
  </svg>
);

const CodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const ChatBubbleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const EditPencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const SidebarHistoryItem = React.memo(function SidebarHistoryItem({
  conv,
  isSelected,
  isEditing,
  editingTitle,
  onSelect,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete
}) {
  return (
    <div
      className={`sidebar-history-item ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
    >
      <ChatBubbleIcon />

      {isEditing ? (
        <input
          type="text"
          className="sidebar-history-edit-input"
          value={editingTitle}
          autoFocus
          onChange={onEditChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSaveEdit();
            } else if (e.key === 'Escape') {
              onCancelEdit();
            }
          }}
          onBlur={onSaveEdit}
        />
      ) : (
        <span className="sidebar-history-item-title" title={conv.title}>
          {conv.title}
        </span>
      )}

      {!isEditing && (
        <div className="sidebar-history-actions">
          <button
            className="sidebar-action-btn edit-btn"
            title="Rename conversation"
            onClick={onStartEdit}
          >
            <EditPencilIcon />
          </button>

          <button
            className="sidebar-action-btn delete-btn"
            title="Delete conversation"
            onClick={onDelete}
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
});

export default function Sidebar({ currentScreen, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    isLoadingConversations,
    isSwitchingCoach,
    coachType,
    renameConversation,
    deleteConversation,
    editingId,
    setEditingId,
    editingTitle,
    setEditingTitle
  } = useConversations();

  const displayedConversations = conversations.filter(c => !c.coach_type || c.coach_type === coachType);

  const navItems = [
    { name: 'Home', screenId: 'dashboard', path: '/dashboard', icon: <HomeIcon /> },
    { name: 'Learning Coach', screenId: 'learning-coach', path: '/learning-coach', icon: <BrainIcon /> },
    { name: 'Coding Coach', screenId: 'coding-coach', path: '/coding-coach', icon: <CodeIcon /> },
    { name: 'Smart Revision', screenId: 'smart-revision', path: '/smart-revision', icon: <BookIcon /> },
    { name: 'Profile', screenId: 'profile', path: '/profile', icon: <UserIcon /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Sidebar (>= 768px) */}
      <aside className="sidebar sidebar-desktop">
        <div
          className="brand-row"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setActiveConversationId(null);
            if (onNavigate) onNavigate('dashboard');
            navigate('/dashboard');
          }}
        >
          <IlmBotLogo size={40} />
          <span className="brand-title">ILMBOT</span>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const isActive = currentScreen 
              ? currentScreen === item.screenId 
              : location.pathname === item.path || (item.screenId === 'dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  setActiveConversationId(null);
                  if (onNavigate) {
                    onNavigate(item.screenId);
                  }
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Contextual Conversation History Section inside Main Sidebar */}
        {coachType && (
          <div className={`sidebar-history-section ${coachType === 'coding' ? 'coding-history' : 'learning-history'}`}>
            <div className="sidebar-history-header">
              <span className="sidebar-history-title">{coachType === 'learning' ? 'Learning Chats' : 'Coding Chats'}</span>
            </div>

            <div className="sidebar-history-list">
              {isLoadingConversations || isSwitchingCoach ? (
                <div className="sidebar-skeleton-group">
                  <div className="sidebar-history-skeleton"></div>
                  <div className="sidebar-history-skeleton"></div>
                  <div className="sidebar-history-skeleton"></div>
                </div>
              ) : displayedConversations.length === 0 ? (
                <div className="sidebar-history-empty">No past conversations</div>
              ) : (
                displayedConversations.map((conv) => {
                  const isSelected = activeConversationId === conv.id;
                  const isEditing = editingId === conv.id;

                  return (
                    <SidebarHistoryItem
                      key={conv.id}
                      conv={conv}
                      isSelected={isSelected}
                      isEditing={isEditing}
                      editingTitle={editingTitle}
                      onSelect={() => {
                        if (!isEditing) {
                          setActiveConversationId(conv.id);
                        }
                      }}
                      onStartEdit={(e) => {
                        e.stopPropagation();
                        setEditingId(conv.id);
                        setEditingTitle(conv.title);
                      }}
                      onEditChange={(e) => setEditingTitle(e.target.value)}
                      onSaveEdit={() => {
                        if (editingTitle.trim()) {
                          renameConversation(conv.id, editingTitle);
                        } else {
                          setEditingId(null);
                        }
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onDelete={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteConversation(conv.id);
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const isActive = currentScreen 
            ? currentScreen === item.screenId 
            : location.pathname === item.path || (item.screenId === 'dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={(e) => {
                if (item.screenId !== coachType) {
                  setActiveConversationId(null);
                }
                if (onNavigate) {
                  onNavigate(item.screenId);
                }
              }}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
