import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import 'katex/dist/katex.min.css';
import IlmBotLogo from './IlmBotLogo';
import { useConversations } from '../context/ConversationContext';
import { scrollToTop } from '../utils/scrollToTop';
import { formatTime12Hour } from '../utils/formatTime';
import { compressImage } from '../utils/compressImage';
import { sanitizeMarkdownText } from '../utils/cleanMarkdown';
import { preprocessMathDelimiters } from '../utils/mathRenderer';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import './CodingCoach.css';

const FlashcardModal = React.lazy(() => import('./FlashcardModal'));

// Safe sanitization schema for AI Markdown responses (allows styling, tables, line breaks)
const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'span', 'div', 'details', 'summary', 'mark', 'kbd', 'abbr'
  ],
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
    div: [...(defaultSchema.attributes?.div || []), 'className', 'style'],
    th: [...(defaultSchema.attributes?.th || []), 'className', 'style', 'align'],
    td: [...(defaultSchema.attributes?.td || []), 'className', 'style', 'align']
  }
};

// SVG Icons for Coding Coach
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const PaperclipIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);


const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const CardsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="14" height="14" rx="2"></rect>
    <path d="M17 14h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"></path>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const AcademicGradIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
  </svg>
);

// Scoped Code Block Component for Coding Coach
function CodeBlock({ codeStr, lang, onWalkthrough }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <div className="code-lang-tag">
          <CodeIcon />
          <span>{lang}</span>
        </div>
        <div className="code-actions-group">
          {onWalkthrough && (
            <button
              className="walkthrough-btn"
              onClick={() => onWalkthrough({ code: codeStr, lang })}
            >
              <span>Code Walkthrough</span>
            </button>
          )}
          <button
            className={`copy-code-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <pre className="code-block-content">
        <code>{codeStr}</code>
      </pre>
    </div>
  );
}

const CodingMessageItem = React.memo(function CodingMessageItem({
  msg,
  apiBaseUrl,
  onSwitchCoach,
  onWalkthrough
}) {
  if (msg.sender === 'reverse-routing') {
    return (
      <div key={msg.id} className="coding-msg-row reverse-routing">
        <div className="reverse-routing-card">
          <div className="reverse-routing-content">
            <div className="reverse-routing-icon">
              <AcademicGradIcon />
            </div>
            <div>
              <div className="reverse-routing-title">Academic Topic Detected</div>
              <div className="reverse-routing-desc">
                {msg.routingMessage || "This looks academic. Continue in Learning Coach?"}
              </div>
            </div>
          </div>
          <button
            className="green-switch-btn"
            onClick={() => onSwitchCoach(msg)}
          >
            Switch & Continue ⟶
          </button>
        </div>
      </div>
    );
  }

  const isUser = msg.sender === 'user';

  return (
    <div key={msg.id} className={`coding-msg-row ${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="coding-msg-avatar ai-avatar">
          <IlmBotLogo size={20} showGlow={false} />
        </div>
      )}

      <div className="coding-msg-bubble">
        {(msg.image || msg.image_url) && (
          <div className="coding-message-image-preview">
            <img
              src={msg.image || (msg.image_url?.startsWith('http') ? msg.image_url : `${apiBaseUrl}${msg.image_url}`)}
              alt="User Code Screenshot"
            />
          </div>
        )}

        {msg.pdf && (
          <div className="attached-pdf-card">
            <div className="attached-pdf-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div className="attached-pdf-info">
              <div className="attached-pdf-name" title={msg.pdf.filename}>{msg.pdf.filename}</div>
              {msg.pdf.fileSize && <div className="attached-pdf-size">{msg.pdf.fileSize}</div>}
            </div>
          </div>
        )}

        {isUser ? (
          <div className="coding-msg-text">{msg.text}</div>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema], rehypeKatex]}
              components={{
                pre({ children }) {
                  return <>{children}</>;
                },
                table({ children, ...props }) {
                  return (
                    <div className="table-responsive-wrapper">
                      <table {...props}>{children}</table>
                    </div>
                  );
                },
                th({ children, ...props }) {
                  return <th {...props}>{children}</th>;
                },
                td({ children, ...props }) {
                  return <td {...props}>{children}</td>;
                },
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeStr = String(children).replace(/\n$/, '');
                  const isBlock = Boolean(match) || (!inline && codeStr.includes('\n'));
                  if (isBlock && codeStr) {
                    const lang = match ? match[1].toUpperCase() : 'CODE';
                    return (
                      <CodeBlock
                        codeStr={codeStr}
                        lang={lang}
                        onWalkthrough={onWalkthrough}
                      />
                    );
                  }
                  return <code className={className} {...props}>{children}</code>;
                }
              }}
            >
              {preprocessMathDelimiters(sanitizeMarkdownText(msg.text))}
            </ReactMarkdown>
          </div>
        )}

        {msg.id !== 'welcome-msg' && msg.time && (
          <span className="coding-msg-time">{msg.time}</span>
        )}
      </div>
    </div>
  );
});

const DEFAULT_WELCOME = {
  id: 'welcome-msg',
  sender: 'ai',
  text: "Welcome to Coding Coach! I am your AI programming mentor. Ask me to explain code, debug syntax errors, or break down algorithms line-by-line. What language or topic are you working on today?"
};

export default function CodingCoach({ onNavigate, initialPrompt: propInitialPrompt }) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    activeConversationId,
    setActiveConversationId,
    fetchConversations,
    deleteConversation,
    pendingSwitchConvId,
    setPendingSwitchConvId,
    pendingSwitchMessages,
    setPendingSwitchMessages,
    skipRouteResetRef,
    setIsSwitchingCoach,
    setConversations,
    setConversationsCache
  } = useConversations();

  const [messages, setMessages] = useState(() => {
    if (pendingSwitchMessages && pendingSwitchMessages.length > 0) {
      return pendingSwitchMessages;
    }
    if (location.state?.switchedMessages && location.state.switchedMessages.length > 0) {
      return location.state.switchedMessages;
    }
    return [DEFAULT_WELCOME];
  });
  const hasExchangedMessages = messages.some(m => m.sender === 'user') && messages.some(m => m.sender === 'ai' && m.id !== 'welcome');
  const [errorBanner, setErrorBanner] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('Coding Coach is analyzing code logic...');

  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingImageName, setPendingImageName] = useState('');
  const baseInputRef = useRef('');

  const {
    isSupported: isSpeechSupported,
    isListening,
    startListening,
    stopListening,
    abortListening
  } = useSpeechRecognition({
    onTranscript: (liveTranscript) => {
      const prefix = baseInputRef.current ? `${baseInputRef.current.trim()} ` : '';
      setInputText(prefix + liveTranscript);
    },
    onError: (err) => {
      setErrorBanner(err);
    }
  });
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardError, setFlashcardError] = useState(null);
  const [activeWalkthrough, setActiveWalkthrough] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const consumedPromptRef = useRef(null);
  const skipNextLoadRef = useRef(false);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const getAuthHeader = () => {
    const token = localStorage.getItem('ilmbot_google_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const deriveTitle = (text) => {
    if (!text) return "New Conversation";
    const clean = text.trim();
    return clean.length > 50 ? clean.slice(0, 50) + "..." : clean;
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPlaceholderText = () => {
    if (isThinking) return "Coding Coach is thinking...";
    if (isListening) return "Listening... Explain your code problem or bug...";
    if (windowWidth < 768) return "Ask a coding question...";
    if (windowWidth < 1024) return "Ask a coding question or paste code...";
    return "Ask a coding question or paste multi-line code... (Shift+Enter for newline)";
  };

  const fetchFlashcards = async (sessionId) => {
    if (!sessionId) {
      setFlashcards([]);
      return;
    }
    setIsLoadingFlashcards(true);
    setFlashcardError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/revision/flashcards/${sessionId}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setFlashcards(data.flashcards || []);
      } else if (res.status === 404) {
        setFlashcards([]);
      }
    } catch (err) {
      console.error("Error loading flashcards in CodingCoach:", err);
    } finally {
      setIsLoadingFlashcards(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!activeConversationId || isGeneratingFlashcards) return;

    // Minimum-content guard: check substantive content before calling API
    const userMsgs = messages.filter(m => m.sender === 'user');
    const assistantChars = messages
      .filter(m => m.sender === 'ai' && m.id !== 'welcome')
      .reduce((acc, m) => acc + (m.text ? m.text.trim().length : 0), 0);

    if (userMsgs.length < 1 || assistantChars < 250) {
      setFlashcardError("This conversation doesn't have enough content yet to generate flashcards. Try asking a few more questions first.");
      return;
    }

    setIsGeneratingFlashcards(true);
    setFlashcardError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/revision/flashcards`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId: activeConversationId })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned status ${res.status}`);
      }
      const data = await res.json();
      setFlashcards(data.flashcards || []);
    } catch (err) {
      console.error("Failed to generate flashcards in CodingCoach:", err);
      setFlashcardError(err.message || "Failed to generate coding flashcards. Please try again.");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleOpenFlashcards = () => {
    if (!hasExchangedMessages) return;
    setShowFlashcards(true);
    if (activeConversationId) {
      fetchFlashcards(activeConversationId);
    }
  };

  const loadConversationDetails = async (convId) => {
    if (!convId) return;
    setErrorBanner(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/conversations/${convId}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map(m => {
            let pdf = null;
            if (m.role === 'user' && m.extracted_content) {
              try {
                const parsed = JSON.parse(m.extracted_content);
                if (parsed.type === 'pdf' && parsed.pdf) pdf = parsed.pdf;
                else if (parsed.pdf) pdf = parsed.pdf;
              } catch {}
            }
            return {
              id: m.id,
              sender: m.role === 'user' ? 'user' : 'ai',
              text: m.content,
              image_url: m.image_url,
              pdf,
              time: formatTime12Hour(new Date(m.created_at))
            };
          }));
        } else {
          setMessages([DEFAULT_WELCOME]);
        }
      } else {
        setErrorBanner("Conversation unavailable.");
      }
    } catch (err) {
      console.error("Error loading conversation details:", err);
      setErrorBanner("Conversation unavailable.");
    }
  };

  const isSwitchingRef = useRef(false);

  const handleSwitchCoach = useCallback((msg) => {
    if (isSwitchingRef.current) return;
    isSwitchingRef.current = true;

    const convId = msg?.conversationId || activeConversationId;
    if (convId) {
      // Build optimistic messages IMMEDIATELY (before any API call)
      let lastUserIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].sender === 'user') { lastUserIdx = i; break; }
      }
      const switchedMsgs = lastUserIdx >= 0
        ? messages.slice(lastUserIdx).filter(m => m.sender !== 'smart-routing')
        : [];

      // Remove switched messages + routing banner from source local state IMMEDIATELY
      if (lastUserIdx >= 0) {
        setMessages(prev => prev.slice(0, lastUserIdx));
      }

      // Clear active conversation so destination coach does not load source conversation
      setActiveConversationId(null);
      setPendingSwitchConvId(convId);
      setPendingSwitchMessages(switchedMsgs);
      setIsSwitchingCoach(true);
      skipRouteResetRef.current = true;
      navigate('/learning-coach', { state: { switchedMessages: switchedMsgs } });

      // Fire-and-forget: split conversation in background
      fetch(`${apiBaseUrl}/api/conversations/${convId}/switch-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ target_coach_type: 'learning' })
      }).then(async (res) => {
        if (res.ok) {
          const newConv = await res.json();
          // Update to the real new conversation ID
          setActiveConversationId(newConv.id);
          if (setConversations) {
            setConversations(prev => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
          }
          if (setConversationsCache) {
            setConversationsCache(prev => ({
              ...prev,
              learning: [newConv, ...(prev.learning || []).filter(c => c.id !== newConv.id)]
            }));
          }
        }
        // Route change effect in ConversationContext handles fetching conversations
      }).catch(err => {
        console.warn('Coach switch error:', err);
      }).finally(() => {
        setIsSwitchingCoach(false);
      });
    } else {
      // No existing conversation — just carry the text
      const prevUserMsg = messages.slice().reverse().find(m => m.sender === 'user');
      const carryText = msg?.originalText || prevUserMsg?.text || '';
      navigate('/learning-coach', { state: { initialPrompt: carryText } });
    }

    isSwitchingRef.current = false;
  }, [messages, navigate, setActiveConversationId, activeConversationId, fetchConversations, apiBaseUrl, getAuthHeader, setPendingSwitchConvId, setPendingSwitchMessages, skipRouteResetRef, setIsSwitchingCoach, setConversations, setConversationsCache]);

  // Reset or load conversation details when activeConversationId or route changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    if (pendingSwitchMessages || location.state?.switchedMessages) {
      return;
    }
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    if (activeConversationId) {
      loadConversationDetails(activeConversationId);
    } else {
      setMessages([DEFAULT_WELCOME]);
      setErrorBanner(null);
    }
  }, [activeConversationId, location.pathname]);

  // Autofocus input on initial mount, activeConversationId change, & when isThinking turns false
  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeConversationId, location.pathname]);

  useEffect(() => {
    if (!isThinking) {
      textareaRef.current?.focus();
    }
  }, [isThinking]);

  // Handle switched conversationId from Learning Coach — optimistic path
  useEffect(() => {
    if (pendingSwitchMessages && pendingSwitchMessages.length > 0) {
      skipNextLoadRef.current = true;
      setMessages(pendingSwitchMessages);
      setPendingSwitchConvId(null);
      setPendingSwitchMessages(null);
      window.history.replaceState({}, document.title);
      return;
    }
    if (location.state?.switchedMessages && location.state.switchedMessages.length > 0) {
      skipNextLoadRef.current = true;
      setMessages(location.state.switchedMessages);
      window.history.replaceState({}, document.title);
      return;
    }
    if (location.state?.conversationId) {
      const targetId = location.state.conversationId;
      setActiveConversationId(targetId);
      loadConversationDetails(targetId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, pendingSwitchConvId, pendingSwitchMessages]);

  // Handle carried initial prompt from Smart Routing (e.g. from Learning Coach)
  useEffect(() => {
    const carriedPrompt = location.state?.initialPrompt || propInitialPrompt;
    if (carriedPrompt && consumedPromptRef.current !== carriedPrompt) {
      consumedPromptRef.current = carriedPrompt;
      setInputText(carriedPrompt);
      window.history.replaceState({}, document.title);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 50);
    }
  }, [location.state, propInitialPrompt]);

  // Auto-expand textarea height up to 160px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputText]);

  // Auto scroll to bottom when messages update (instant load for existing threads, smooth during live chat)
  useLayoutEffect(() => {
    if (isInitialLoadRef.current) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialLoadRef.current = false;
    } else {
      const raf = requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [messages, isThinking]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([DEFAULT_WELCOME]);
    setErrorBanner(null);
    setFlashcards([]);
    setFlashcardError(null);
    setDocumentStatus(null);
    textareaRef.current?.focus();
  };

  const handleSend = async (textToSend = null) => {
    const text = textToSend !== null ? textToSend : inputText.trim();
    if (isThinking) return;
    if (!text && !pendingFile) return;

    // Immediately stop voice recording and discard any trailing audio/transcripts
    abortListening();
    baseInputRef.current = '';

    setErrorBanner(null);
    const currentTime = formatTime12Hour(new Date());
    let currentConvId = activeConversationId;
    const fileToUpload = pendingFile;
    const imagePreviewToKeep = pendingImage;
    const messageText = text;

    // Reset input state immediately
    setInputText('');
    setPendingFile(null);
    setPendingImage(null);
    setPendingImageName('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Handle Image Upload Flow via POST /api/chat/image
    if (fileToUpload) {
      const userMsgLocal = {
        id: Date.now().toString(),
        sender: 'user',
        text: text,
        image: imagePreviewToKeep,
        time: currentTime
      };

      setMessages(prev => [...prev, userMsgLocal]);
      setThinkingText('Analyzing code with Vision AI...');
      setIsThinking(true);

      const progressTimer = setTimeout(() => {
        setThinkingText('Generating code fix with Groq...');
      }, 4000);

      try {
        const formData = new FormData();
        formData.append('image', fileToUpload);
        formData.append('coach_type', 'coding');
        if (text) formData.append('message', text);
        if (currentConvId) formData.append('conversation_id', currentConvId);

        const res = await fetch(`${apiBaseUrl}/api/chat/image`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const detail = errData.detail || "Unable to analyze image. Please try again.";
          setErrorBanner(detail);
          setIsThinking(false);
          return;
        }

        const data = await res.json();

        // Update active conversation if it was newly created
        if (!currentConvId && data.conversation_id) {
          skipNextLoadRef.current = true;
          setActiveConversationId(data.conversation_id);
          fetchConversations('coding');
        }

        // Update user message image_url in state if provided
        if (data.user_message && data.user_message.image_url) {
          setMessages(prev => prev.map(m => m.id === userMsgLocal.id ? { ...m, image_url: data.user_message.image_url } : m));
        }

        const aiMsgLocal = {
          id: data.id || Date.now().toString(),
          sender: 'ai',
          text: data.answer || data.content,
          time: formatTime12Hour(new Date(data.created_at))
        };

        if (data.suggestRouting || data.suggest_routing) {
          const bannerMsg = {
            id: 'reverse-routing-' + Date.now(),
            sender: 'reverse-routing',
            routingType: data.routing_type || 'academic_image',
            routingMessage: data.routing_message || "This looks academic. Continue in Learning Coach?",
            conversationId: data.conversation_id || currentConvId,
            time: currentTime
          };
          setMessages(prev => [...prev, aiMsgLocal, bannerMsg]);
        } else {
          setMessages(prev => [...prev, aiMsgLocal]);
        }
      } catch (err) {
        console.error("Error sending image chat:", err);
        setErrorBanner("Unable to analyze image. Please try again.");
      } finally {
        clearTimeout(progressTimer);
        setIsThinking(false);
      }
      return;
    }

    // Text-only Chat Flow
    const userMsgLocal = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageText,
      time: currentTime
    };

    setMessages(prev => [...prev, userMsgLocal]);

    setThinkingText('Coding Coach is analyzing...');
    setIsThinking(true);

    try {
      const chatRes = await fetch(`${apiBaseUrl}/api/coding-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          conversation_id: currentConvId || null,
          message: messageText
        })
      });

      if (!chatRes.ok) {
        const errData = await chatRes.json().catch(() => ({}));
        const userFacingDetail = errData.detail || "Unable to generate response. Please try again.";
        setErrorBanner(userFacingDetail);
        setIsThinking(false);
        return;
      }

      const aiData = await chatRes.json();

      if (aiData.suggestRouting || aiData.suggest_routing) {
        const bannerMsg = {
          id: 'reverse-routing-' + Date.now(),
          sender: 'reverse-routing',
          originalText: messageText,
          routingType: aiData.routing_type || 'academic_text',
          routingMessage: aiData.routing_message || "This looks academic. Continue in Learning Coach?",
          conversationId: aiData.conversation_id || null,
          isTemporary: !currentConvId,
          time: currentTime
        };

        if (aiData.content && aiData.content.trim()) {
          const aiMsgLocal = {
            id: aiData.id || Date.now().toString(),
            sender: 'ai',
            text: aiData.content,
            time: aiData.created_at ? formatTime12Hour(new Date(aiData.created_at)) : currentTime
          };
          setMessages(prev => [...prev, aiMsgLocal, bannerMsg]);
        } else {
          setMessages(prev => [...prev, bannerMsg]);
        }
      } else {
        const aiMsgLocal = {
          id: aiData.id || Date.now().toString(),
          sender: 'ai',
          text: aiData.content,
          time: aiData.created_at ? formatTime12Hour(new Date(aiData.created_at)) : currentTime
        };

        setMessages(prev => [...prev, aiMsgLocal]);
      }

      if (aiData.conversation_id) {
        if (!currentConvId || currentConvId !== aiData.conversation_id) {
          skipNextLoadRef.current = true;
          setActiveConversationId(aiData.conversation_id);
        }
        fetchConversations('coding');
      }
    } catch (err) {
      console.error("Error communicating with Coding Coach backend API:", err);
      setErrorBanner("Unable to generate response. Please try again.");
    } finally {
      setIsThinking(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.type)) {
      setErrorBanner("Invalid file type. Only JPG, PNG, and WEBP images are supported.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorBanner("File size exceeds the 10MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrorBanner(null);
    setPendingImageName(file.name);

    try {
      // Client-side image optimization (max 1600px, 85% quality)
      const optimized = await compressImage(file);
      setPendingFile(optimized.file);
      setPendingImage(optimized.dataUrl);
    } catch (err) {
      console.warn("Client-side image optimization fallback to raw file:", err);
      setPendingFile(file);
      const reader = new FileReader();
      reader.onload = () => setPendingImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const toggleVoiceRecord = () => {
    if (isListening) {
      stopListening();
    } else {
      setErrorBanner(null);
      baseInputRef.current = inputText;
      startListening();
    }
  };

  const getLatestCodeBlock = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.sender === 'ai') {
        const match = /```(\w+)?\n([\s\S]*?)```/.exec(msg.text);
        if (match) {
          return { code: match[2].trim(), lang: match[1] ? match[1].toUpperCase() : 'CODE' };
        }
      }
    }
    return null;
  };

  const downloadLatestCode = () => {
    if (!hasExchangedMessages) return;
    const latest = getLatestCodeBlock();
    if (!latest) return;

    const extMap = {
      PYTHON: 'py',
      JAVASCRIPT: 'js',
      JS: 'js',
      JAVA: 'java',
      CPP: 'cpp',
      C: 'c',
      HTML: 'html',
      CSS: 'css',
      SQL: 'sql'
    };

    const ext = extMap[latest.lang] || 'txt';
    const blob = new Blob([latest.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IlmBot_Snippet_${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="coding-coach-container page-fade-in">
      {/* Code Walkthrough Modal Overlay */}
      {activeWalkthrough && (
        <div className="flashcards-modal-overlay">
          <div className="walkthrough-modal-panel">
            <div className="flashcards-modal-header">
              <h3>Interactive Code Walkthrough ({activeWalkthrough.lang})</h3>
              <button className="close-modal-btn" onClick={() => setActiveWalkthrough(null)}>✕</button>
            </div>
            <div className="walkthrough-lines-list">
              {activeWalkthrough.code.split('\n').filter(line => line.trim() !== '').map((lineText, idx, arr) => (
                <div key={idx} className="walkthrough-line-item">
                  <span className="line-num-badge">Line {idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div className="line-code-snippet">{lineText}</div>
                    <div className="line-explanation">
                      {idx === 0
                        ? "Initialization: Defines imports, variables, or main structure."
                        : idx === arr.length - 1
                        ? "Execution / Return: Output statement or function return value."
                        : "Logic Step: Evaluates conditions, calls functions, or updates state."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Coding Flashcards Modal Overlay */}
      {showFlashcards && (
        <React.Suspense fallback={null}>
          <FlashcardModal
            isOpen={showFlashcards}
            onClose={() => setShowFlashcards(false)}
            cards={flashcards}
            theme="coding"
            title="Coding Coach Flashcards"
            isLoading={isLoadingFlashcards}
            isGenerating={isGeneratingFlashcards}
            error={flashcardError}
            onGenerate={handleGenerateFlashcards}
            onRegenerate={handleGenerateFlashcards}
            canGenerate={Boolean(activeConversationId && messages.some(m => m.sender === 'user'))}
            emptyMessage={!activeConversationId || !messages.some(m => m.sender === 'user')
              ? "Ask a question or explain a code problem to Coding Coach first, then generate active recall flashcards from your coding session!"
              : null
            }
          />
        </React.Suspense>
      )}

      {/* Main Full-Width Coding Chat Shell */}
      <div className="coding-chat-shell">
        {/* Header Bar */}
        <div className="coding-header-bar">
          <div className="coding-header-info">
            <IlmBotLogo size={32} showGlow={false} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px', color: '#FFF' }}>Coding Coach</div>
            </div>
          </div>

          <div className="coding-header-actions">
            <button
              className="coding-tool-btn"
              onClick={handleNewChat}
              title="Start a new coding thread"
            >
              <PlusIcon />
              <span>New Chat</span>
            </button>

            <button
              className="coding-tool-btn"
              onClick={downloadLatestCode}
              disabled={!hasExchangedMessages || !getLatestCodeBlock()}
              title={!hasExchangedMessages ? "Start a coding chat to download code" : (getLatestCodeBlock() ? "Download latest code snippet" : "No code to download yet")}
            >
              <DownloadIcon />
              <span>Download Code</span>
            </button>

            <button
              className="coding-tool-btn"
              onClick={handleOpenFlashcards}
              disabled={!hasExchangedMessages}
              title={hasExchangedMessages ? "Practice AI coding flashcards" : "Start a coding chat to practice flashcards"}
            >
              <CardsIcon />
              <span>Coding Flashcards</span>
            </button>
          </div>
        </div>

        {/* Inline Error Banner */}
        {errorBanner && (
          <div className="coding-error-banner">
            <span>⚠️ {errorBanner}</span>
            <button className="close-banner-btn" onClick={() => setErrorBanner(null)}>✕</button>
          </div>
        )}

        {/* Message Stream */}
        <div className="coding-messages-container" ref={messagesContainerRef}>
          {messages.map((msg) => (
            <CodingMessageItem
              key={msg.id}
              msg={msg}
              apiBaseUrl={apiBaseUrl}
              onSwitchCoach={handleSwitchCoach}
              onWalkthrough={setActiveWalkthrough}
            />
          ))}

          {/* Assistant Typing & Loading Bubble State */}
          {isThinking && (
            <div className="coding-msg-row ai coding-thinking-row">
              <div className="coding-msg-avatar ai-avatar">
                <IlmBotLogo size={20} showGlow={false} />
              </div>
              <div className="coding-msg-bubble thinking-bubble">
                <div className="thinking-header">
                  <div className="thinking-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                  <span className="thinking-text">{thinkingText}</span>
                </div>
                <div className="typing-skeleton-container" aria-hidden="true">
                  <div className="typing-skeleton-line short"></div>
                  <div className="typing-skeleton-line medium"></div>
                  <div className="typing-skeleton-line long"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pending Attachment Bar */}
        {pendingImage && (
          <div className="coding-pending-attachment-bar">
            <img src={pendingImage} alt="Attachment Preview" className="pending-thumb" />
            <span className="pending-filename">{pendingImageName || 'code_screenshot.png'}</span>
            <button
              className="remove-thumb-btn"
              title="Remove attached image"
              onClick={() => {
                setPendingImage(null);
                setPendingImageName('');
                setPendingFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              ✕
            </button>
          </div>
        )}


        {/* Recording Visual Bar */}
        {isListening && (
          <div className="coding-recording-status-bar">
            <span className="coding-rec-pulse-dot"></span>
            <span className="coding-rec-status-text">Listening... Explain your code problem or bug</span>
            <div className="coding-waveform-lines">
              <span className="coding-waveform-bar"></span>
              <span className="coding-waveform-bar"></span>
              <span className="coding-waveform-bar"></span>
              <span className="coding-waveform-bar"></span>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="coding-input-bar">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageSelect}
            disabled={isThinking}
          />

          <button
            type="button"
            className="coding-icon-btn"
            title="Attach image"
            aria-label="Attach image"
            onClick={() => fileInputRef.current?.click()}
            disabled={isThinking}
          >
            <ImageIcon />
          </button>

          <button
            type="button"
            className={`coding-icon-btn ${isListening ? 'recording-active' : ''}`}
            aria-label={isListening ? "Stop Voice Input" : "Start Voice Input"}
            title={!isSpeechSupported ? "Voice input is not supported in this browser." : (isListening ? "Stop Voice Recording" : "Voice Code Input")}
            onClick={toggleVoiceRecord}
            disabled={isThinking}
          >
            <MicIcon />
          </button>

          <textarea
            ref={textareaRef}
            className="coding-textarea-field"
            placeholder={getPlaceholderText()}
            value={inputText}
            disabled={isThinking}
            rows={1}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <button
            className="coding-send-btn"
            disabled={(!inputText.trim() && !pendingImage) || isThinking}
            onClick={() => handleSend()}
            title="Send Code Message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
