import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ConversationContext = createContext();

export function ConversationProvider({ children }) {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [conversationsCache, setConversationsCache] = useState({ learning: [], coding: [] });
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [errorBanner, setErrorBanner] = useState(null);
  const deletedConvIdsRef = useRef(new Set());

  // Coach-switch optimistic transfer state
  const [pendingSwitchConvId, setPendingSwitchConvId] = useState(null);
  const [pendingSwitchMessages, setPendingSwitchMessages] = useState(null);
  const [isSwitchingCoach, setIsSwitchingCoach] = useState(false);
  const skipRouteResetRef = useRef(false);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const getAuthHeader = () => {
    const token = localStorage.getItem('ilmbot_google_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Background keep-alive ping every 4 minutes to prevent Neon PostgreSQL auto-suspend during user sessions
  useEffect(() => {
    const pingBackend = () => {
      fetch(`${apiBaseUrl}/health`).catch(() => {});
    };
    pingBackend();
    const interval = setInterval(pingBackend, 240000);
    return () => clearInterval(interval);
  }, []);

  const getCoachTypeFromPath = () => {
    if (location.pathname === '/learning-coach') return 'learning';
    if (location.pathname === '/coding-coach') return 'coding';
    return null;
  };

  const coachType = getCoachTypeFromPath();

  const fetchConversations = async (type = coachType) => {
    const currentPathCoach = getCoachTypeFromPath();
    const targetType = type || currentPathCoach;
    if (!targetType) {
      setConversations([]);
      setIsLoadingConversations(false);
      return [];
    }

    // Serve from cache immediately if present to optimize page transition speed (filtering out deleted items)
    if (conversationsCache[targetType] && conversationsCache[targetType].length > 0) {
      const cached = conversationsCache[targetType].filter(c => !deletedConvIdsRef.current.has(c.id));
      if (targetType === getCoachTypeFromPath()) {
        setConversations(cached);
        setIsLoadingConversations(false);
      }
    } else if (targetType === getCoachTypeFromPath()) {
      setIsLoadingConversations(true);
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/conversations?coach_type=${targetType}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        const validData = data.filter(c => !deletedConvIdsRef.current.has(c.id));
        setConversationsCache(prev => ({ ...prev, [targetType]: validData }));
        if (targetType === getCoachTypeFromPath()) {
          setConversations(validData);
        }
        return validData;
      }
    } catch (err) {
      console.warn(`Failed to fetch ${targetType} conversations:`, err);
    } finally {
      if (targetType === getCoachTypeFromPath()) {
        setIsLoadingConversations(false);
      }
    }
    return [];
  };

  // Reset active conversation & fetch list whenever route changes
  // Skip reset when navigating via coach switch to avoid blank flash
  useEffect(() => {
    if (skipRouteResetRef.current) {
      skipRouteResetRef.current = false;
      // Still fetch sidebar conversations in the background
      if (coachType) {
        fetchConversations(coachType);
      }
      return;
    }

    setActiveConversationId(null);
    setEditingId(null);
    setErrorBanner(null);

    if (coachType) {
      fetchConversations(coachType);
    } else {
      setConversations([]);
      setIsLoadingConversations(false);
    }
  }, [location.pathname]);

  const renameConversation = async (convId, newTitle) => {
    const clean = newTitle.trim();
    if (!clean || clean.length > 100) return false;
    try {
      const res = await fetch(`${apiBaseUrl}/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ title: clean })
      });
      if (res.ok) {
        const updated = await res.json();
        setConversations(prev => {
          const next = prev.map(c => c.id === convId ? updated : c);
          if (coachType) {
            setConversationsCache(cache => ({ ...cache, [coachType]: next }));
          }
          return next;
        });
        setEditingId(null);
        return true;
      }
    } catch (err) {
      console.error("Failed renaming conversation:", err);
    }
    return false;
  };

  const deleteConversation = (convId) => {
    if (!convId) return;
    deletedConvIdsRef.current.add(convId);

    // Optimistically remove from state and all caches immediately
    setConversations(prev => prev.filter(c => c.id !== convId));
    setConversationsCache(cache => ({
      learning: (cache.learning || []).filter(c => c.id !== convId),
      coding: (cache.coding || []).filter(c => c.id !== convId)
    }));

    if (activeConversationId === convId) {
      setActiveConversationId(null);
    }

    // Asynchronous background deletion without blocking UI updates
    fetch(`${apiBaseUrl}/api/conversations/${convId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    }).catch(err => {
      console.error("Failed deleting conversation on server:", err);
    });
  };

  return (
    <ConversationContext.Provider value={{
      conversations,
      setConversations,
      activeConversationId,
      setActiveConversationId,
      isLoadingConversations,
      coachType,
      fetchConversations,
      renameConversation,
      deleteConversation,
      editingId,
      setEditingId,
      editingTitle,
      setEditingTitle,
      errorBanner,
      setErrorBanner,
      pendingSwitchConvId,
      setPendingSwitchConvId,
      pendingSwitchMessages,
      setPendingSwitchMessages,
      skipRouteResetRef,
      isSwitchingCoach,
      setIsSwitchingCoach,
      setConversationsCache
    }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversations must be used within a ConversationProvider");
  }
  return context;
}
