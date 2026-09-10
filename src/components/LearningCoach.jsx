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
import './LearningCoach.css';

const FlashcardModal = React.lazy(() => import('./FlashcardModal'));
const DocumentLibraryModal = React.lazy(() => import('./DocumentLibraryModal'));

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

// SVG Icons
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

const DocumentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
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

const CodeTerminalIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
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



// Scoped Code Block Component for Learning Coach
function LearningCodeBlock({ codeStr, lang }) {
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
          <span>💻</span>
          <span>{lang}</span>
        </div>
        <div className="code-actions-group">
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

// Scoped Citation Chips and Preview Component
function CitationSources({ citations }) {
  const [activeCitation, setActiveCitation] = useState(null);

  if (!citations || citations.length === 0) return null;

  // Normalize camelCase and snake_case properties
  const normalized = citations.map((c, originalIdx) => ({
    id: c.document_id || c.documentId || `doc-${originalIdx}`,
    filename: c.filename || 'Document',
    chunkIndex: c.chunk_index !== undefined && c.chunk_index !== null
      ? c.chunk_index
      : (c.chunkIndex !== undefined && c.chunkIndex !== null ? c.chunkIndex : null),
    excerpt: c.excerpt || '',
    originalIdx
  }));

  // Deduplicate by filename + chunkIndex
  const seen = new Set();
  const uniqueCitations = [];
  for (const item of normalized) {
    const key = `${item.filename}-${item.chunkIndex}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCitations.push(item);
    }
  }

  if (uniqueCitations.length === 0) return null;

  return (
    <div className="citations-container">
      <div className="citations-header">
        <span className="citations-label">Referenced from:</span>
        <div className="citations-chips-list">
          {uniqueCitations.map((c, idx) => {
            const isExpanded = activeCitation === idx;
            return (
              <button
                key={`${c.id}-${c.chunkIndex !== null ? c.chunkIndex : idx}`}
                type="button"
                className={`citation-chip ${isExpanded ? 'active' : ''}`}
                onClick={() => setActiveCitation(isExpanded ? null : idx)}
                title={`Click to preview excerpt from ${c.filename}`}
              >
                <span className="citation-chip-icon">📄</span>
                <span className="citation-chip-name">{c.filename}</span>
                {c.chunkIndex !== null && (
                  <span className="citation-chip-index">#{c.chunkIndex + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeCitation !== null && uniqueCitations[activeCitation] && (
        <div className="citation-preview-card">
          <div className="citation-preview-header">
            <div className="citation-preview-title">
              <span className="citation-preview-icon">📖</span>
              <strong>{uniqueCitations[activeCitation].filename}</strong>
              {uniqueCitations[activeCitation].chunkIndex !== null && (
                <span className="citation-preview-chunk">
                  (Section #{uniqueCitations[activeCitation].chunkIndex + 1})
                </span>
              )}
            </div>
            <button
              type="button"
              className="citation-preview-close"
              onClick={() => setActiveCitation(null)}
              aria-label="Close excerpt preview"
            >
              ✕
            </button>
          </div>
          <div className="citation-preview-body">
            <p className="citation-excerpt">
              &ldquo;{uniqueCitations[activeCitation].excerpt}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const LearningMessageItem = React.memo(function LearningMessageItem({
  msg,
  apiBaseUrl,
  onSwitchCoach
}) {
  if (msg.sender === 'smart-routing') {
    return (
      <div key={msg.id} className="message-row smart-routing">
        <div className="smart-routing-card">
          <div className="smart-routing-content">
            <div className="smart-routing-icon">
              <CodeTerminalIcon />
            </div>
            <div>
              <div className="smart-routing-title">
                {msg.routingType === 'coding_pdf' || (msg.routingMessage && msg.routingMessage.toLowerCase().includes('document'))
                  ? 'Programming Document Detected'
                  : 'Programming Question Detected'}
              </div>
              <div className="smart-routing-desc">
                {msg.routingMessage || "This looks like a coding problem. Continue in Coding Coach?"}
              </div>
            </div>
          </div>
          <button
            className="switch-btn green-switch-btn"
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
    <div key={msg.id} className={`message-row ${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="msg-avatar ai-avatar">
          <IlmBotLogo size={20} showGlow={false} />
        </div>
      )}

      <div className="msg-bubble">
        {(msg.image || msg.image_url) && (
          <div className="attached-img-preview">
            <img
              src={msg.image || (msg.image_url?.startsWith('http') ? msg.image_url : `${apiBaseUrl}${msg.image_url}`)}
              alt="User Upload"
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
          <div className="msg-text">{msg.text}</div>
        ) : (
          <>
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
                      return <LearningCodeBlock codeStr={codeStr} lang={lang} />;
                    }
                    return <code className={className} {...props}>{children}</code>;
                  }
                }}
              >
                {preprocessMathDelimiters(sanitizeMarkdownText(msg.text))}
              </ReactMarkdown>
            </div>
            {msg.citations && msg.citations.length > 0 && (
              <CitationSources citations={msg.citations} />
            )}
          </>
        )}

        {msg.id !== 'welcome-msg' && msg.time && (
          <span className="msg-time">{msg.time}</span>
        )}
      </div>
    </div>
  );
});

const DEFAULT_WELCOME = {
  id: 'welcome-msg',
  sender: 'ai',
  text: "Welcome to Learning Coach. I am your personal AI academic tutor. Ask me any question, request step-by-step breakdowns, or generate study flashcards on any subject. What topic shall we explore today?"
};

export default function LearningCoach({ onNavigate, initialPrompt: propInitialPrompt }) {
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
  const [thinkingText, setThinkingText] = useState('Learning Coach is reasoning...');
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingImageName, setPendingImageName] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [documentStatus, setDocumentStatus] = useState(null);
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
  const [showDocLibrary, setShowDocLibrary] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardError, setFlashcardError] = useState(null);

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
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
      console.error("Error loading flashcards in LearningCoach:", err);
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
      console.error("Failed to generate flashcards in LearningCoach:", err);
      setFlashcardError(err.message || "Failed to generate study flashcards. Please try again.");
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
      navigate('/coding-coach', { state: { switchedMessages: switchedMsgs } });

      // Fire-and-forget: split conversation in background
      fetch(`${apiBaseUrl}/api/conversations/${convId}/switch-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ target_coach_type: 'coding' })
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
              coding: [newConv, ...(prev.coding || []).filter(c => c.id !== newConv.id)]
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
      navigate('/coding-coach', { state: { initialPrompt: carryText } });
    }

    isSwitchingRef.current = false;
  }, [messages, navigate, setActiveConversationId, activeConversationId, fetchConversations, apiBaseUrl, getAuthHeader, setPendingSwitchConvId, setPendingSwitchMessages, skipRouteResetRef, setIsSwitchingCoach, setConversations, setConversationsCache]);

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
            let citations = m.citations || [];
            let pdf = null;
            if (m.extracted_content) {
              try {
                const parsed = JSON.parse(m.extracted_content);
                if (m.role === 'user') {
                  if (parsed.type === 'pdf' && parsed.pdf) pdf = parsed.pdf;
                  else if (parsed.pdf) pdf = parsed.pdf;
                } else {
                  if (Array.isArray(parsed) && (!citations || citations.length === 0)) citations = parsed;
                }
              } catch {}
            }
            return {
              id: m.id,
              sender: m.role === 'user' ? 'user' : 'ai',
              text: m.content,
              image_url: m.image_url,
              pdf,
              citations,
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
    inputRef.current?.focus();
  }, [activeConversationId, location.pathname]);

  useEffect(() => {
    if (!isThinking) {
      inputRef.current?.focus();
    }
  }, [isThinking]);

  useEffect(() => {
    if (!showAttachMenu) return undefined;

    const handlePointerDown = (event) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setShowAttachMenu(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showAttachMenu]);

  // Handle switched conversationId from Coding Coach — optimistic path
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

  // Handle carried initial prompt from Smart Routing (e.g. from Coding Coach)
  useEffect(() => {
    const carriedPrompt = location.state?.initialPrompt || propInitialPrompt;
    if (carriedPrompt && consumedPromptRef.current !== carriedPrompt) {
      consumedPromptRef.current = carriedPrompt;
      setInputText(carriedPrompt);
      window.history.replaceState({}, document.title);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = inputRef.current.value.length;
          inputRef.current.selectionEnd = inputRef.current.value.length;
        }
      }, 50);
    }
  }, [location.state, propInitialPrompt]);

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
    inputRef.current?.focus();
  };

  const handleSend = async (textToSend = null) => {
    const text = textToSend !== null ? textToSend : inputText.trim();
    const attachedDocument = documentStatus?.kind === 'success' && documentStatus.id
      ? documentStatus
      : null;
    if (isUploadingDocument || isThinking) return;
    if (!text && !pendingFile && !attachedDocument) return;

    // Immediately stop voice recording and discard any trailing audio/transcripts
    abortListening();
    baseInputRef.current = '';

    setErrorBanner(null);
    const currentTime = formatTime12Hour(new Date());
    let currentConvId = activeConversationId;
    const fileToUpload = pendingFile;
    const imagePreviewToKeep = pendingImage;
    const attachedDocumentIds = attachedDocument?.id ? [attachedDocument.id] : [];
    const messageText = text || (attachedDocument ? 'Please use the attached PDF.' : '');

    // Reset input state immediately (PDF attachment is part of this send, not a leftover composer chip)
    setInputText('');
    setPendingFile(null);
    setPendingImage(null);
    setPendingImageName('');
    setDocumentStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (pdfInputRef.current) pdfInputRef.current.value = '';

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
      setThinkingText('Analyzing image with Vision AI...');
      setIsThinking(true);

      const progressTimer = setTimeout(() => {
        setThinkingText('Generating tutoring breakdown with Groq...');
      }, 4000);

      try {
        const formData = new FormData();
        formData.append('image', fileToUpload);
        formData.append('coach_type', 'learning');
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
          fetchConversations('learning');
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
            id: 'smart-routing-' + Date.now(),
            sender: 'smart-routing',
            routingType: data.routing_type || 'coding_image',
            routingMessage: data.routing_message || "This looks like a coding problem. Continue in Coding Coach?",
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

    // Text-only / Document Chat Flow
    const userMsgLocal = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageText,
      pdf: attachedDocument ? {
        filename: attachedDocument.filename,
        fileSize: attachedDocument.chunkCount ? `${attachedDocument.chunkCount} chunks` : undefined
      } : null,
      time: currentTime
    };

    setMessages(prev => [...prev, userMsgLocal]);

    setThinkingText('Learning Coach is reasoning...');
    setIsThinking(true);

    try {
      const chatRes = await fetch(`${apiBaseUrl}/api/learning-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          conversation_id: currentConvId || null,
          message: messageText,
          documentIds: attachedDocumentIds.length ? attachedDocumentIds : undefined,
          pdfAttachment: attachedDocument ? {
            document_id: attachedDocument.id,
            filename: attachedDocument.filename,
            file_size: attachedDocument.chunkCount ? `${attachedDocument.chunkCount} chunks` : undefined
          } : undefined
        })
      });

      if (!chatRes.ok) {
        const errData = await chatRes.json().catch(() => ({}));
        const userFacingDetail = errData.detail || "Unable to generate response. Please try again.";
        setErrorBanner(userFacingDetail);
        if (attachedDocument) setDocumentStatus(attachedDocument);
        setIsThinking(false);
        return;
      }

      const aiData = await chatRes.json();

      if (aiData.suggestRouting || aiData.suggest_routing) {
        const bannerMsg = {
          id: 'smart-routing-' + Date.now(),
          sender: 'smart-routing',
          originalText: messageText,
          routingType: aiData.routing_type || (attachedDocument ? "coding_pdf" : "coding_text"),
          routingMessage: aiData.routing_message || (attachedDocument ? "This document appears to be programming-related. Continue in Coding Coach?" : "This looks like a coding problem. Continue in Coding Coach?"),
          conversationId: aiData.conversation_id || currentConvId || null,
          isTemporary: !currentConvId && !aiData.conversation_id,
          time: currentTime
        };

        if (aiData.content && aiData.content.trim()) {
          const aiMsgLocal = {
            id: aiData.id || Date.now().toString(),
            sender: 'ai',
            text: aiData.content,
            citations: aiData.citations || [],
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
          citations: aiData.citations || [],
          time: aiData.created_at ? formatTime12Hour(new Date(aiData.created_at)) : currentTime
        };

        setMessages(prev => [...prev, aiMsgLocal]);
      }

      if (aiData.conversation_id) {
        if (!currentConvId || currentConvId !== aiData.conversation_id) {
          skipNextLoadRef.current = true;
          setActiveConversationId(aiData.conversation_id);
        }
        fetchConversations('learning');
      }
    } catch (err) {
      console.error("Error communicating with Learning Coach backend API:", err);
      setErrorBanner("Unable to generate response. Please try again.");
      if (attachedDocument) setDocumentStatus(attachedDocument);
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

  const handlePdfSelect = async (e) => {
    const file = e.target.files?.[0];
    if (pdfInputRef.current) pdfInputRef.current.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const isPdfMime = !file.type || file.type === 'application/pdf' || file.type === 'application/x-pdf' || file.type === 'application/octet-stream';
    if (ext !== 'pdf' || !isPdfMime) {
      setErrorBanner("Invalid file type. Only PDF documents are supported.");
      setShowAttachMenu(false);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorBanner("File size exceeds the 20MB limit.");
      setShowAttachMenu(false);
      return;
    }

    setShowAttachMenu(false);
    setErrorBanner(null);
    setDocumentStatus({ kind: 'uploading', filename: file.name, statusText: 'Uploading PDF…' });
    setIsUploadingDocument(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${apiBaseUrl}/api/documents/upload?stream=true`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const detail = errData.detail || "Unable to upload document. Please try again.";
        throw new Error(typeof detail === 'string' ? detail : "Unable to upload document. Please try again.");
      }

      let finalData = null;

      // Handle streaming NDJSON response
      if (res.body && res.body.getReader) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed);
              if (event.stage === 'error') {
                throw new Error(event.error || "Document processing failed.");
              }
              if (event.stage === 'text_detected') {
                setDocumentStatus({
                  kind: 'uploading',
                  filename: file.name,
                  statusText: 'Text PDF detected'
                });
              } else if (event.stage === 'ocr_processing') {
                setDocumentStatus({
                  kind: 'uploading',
                  filename: file.name,
                  statusText: 'OCR Processing PDF…'
                });
              } else if (event.stage === 'complete' && event.data) {
                finalData = event.data;
              }
            } catch (pErr) {
              if (pErr.message && !pErr.message.includes('JSON')) {
                throw pErr;
              }
            }
          }
        }

        if (!finalData && buffer.trim()) {
          try {
            const event = JSON.parse(buffer.trim());
            if (event.stage === 'complete' && event.data) {
              finalData = event.data;
            } else if (event.id) {
              finalData = event;
            }
          } catch (_) {}
        }
      } else {
        // Fallback for environments without stream reader
        finalData = await res.json();
      }

      if (!finalData) {
        throw new Error("Unable to attach document. Please try again.");
      }

      const documentId = finalData.id || finalData.documentId || finalData.document_id;
      if (!documentId) {
        throw new Error("Unable to attach document. Please try again.");
      }

      const chunkCount = finalData.chunkCount ?? finalData.chunk_count ?? 0;
      const extractionMethod = finalData.extractionMethod || 'text';
      const statusMessage = finalData.statusMessage || (extractionMethod === 'ocr' ? 'OCR Complete' : 'Text PDF detected');

      setDocumentStatus({
        kind: 'success',
        id: documentId,
        filename: finalData.filename || file.name,
        chunkCount,
        extractionMethod,
        statusMessage
      });
    } catch (err) {
      console.error("Error uploading PDF document:", err);
      setDocumentStatus(null);
      setErrorBanner(err.message || "Unable to upload document. Please try again.");
    } finally {
      setIsUploadingDocument(false);
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

  const exportChatToPDF = async () => {
    if (!hasExchangedMessages) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(34, 197, 94);
    doc.text("ILMBOT - Learning Coach Summary", 20, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPos);

    yPos += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    messages.forEach((msg) => {
      if (msg.sender === 'smart-routing') return;

      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const isUser = msg.sender === 'user';
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(isUser ? 37 : 34, isUser ? 99 : 197, isUser ? 235 : 94);
      doc.text(isUser ? "You:" : "Learning Coach:", 20, yPos);

      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);

      const splitText = doc.splitTextToSize(msg.text || '[Image attached]', 165);
      doc.text(splitText, 25, yPos);

      yPos += (splitText.length * 5) + 8;
    });

    doc.save(`IlmBot_Learning_Summary_${Date.now()}.pdf`);
  };

  const copyCode = (codeStr, keyId) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCodeId(keyId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="learning-coach-container page-fade-in">
      {/* Flashcards Modal Overlay */}
      {showFlashcards && (
        <React.Suspense fallback={null}>
          <FlashcardModal
            isOpen={showFlashcards}
            onClose={() => setShowFlashcards(false)}
            cards={flashcards}
            theme="learning"
            title="Learning Coach Flashcards"
            isLoading={isLoadingFlashcards}
            isGenerating={isGeneratingFlashcards}
            error={flashcardError}
            onGenerate={handleGenerateFlashcards}
            onRegenerate={handleGenerateFlashcards}
            canGenerate={Boolean(activeConversationId && messages.some(m => m.sender === 'user'))}
            emptyMessage={!activeConversationId || !messages.some(m => m.sender === 'user')
              ? "Ask a question to Learning Coach first, then generate active recall flashcards from your study session!"
              : null
            }
          />
        </React.Suspense>
      )}

      {/* Document Library Modal Overlay */}
      {showDocLibrary && (
        <React.Suspense fallback={null}>
          <DocumentLibraryModal
            isOpen={showDocLibrary}
            onClose={() => setShowDocLibrary(false)}
            onDocumentDeleted={(deletedId, deletedConvId) => {
              if (documentStatus?.id === deletedId) {
                setDocumentStatus(null);
              }
              if (deletedConvId) {
                if (activeConversationId === deletedConvId) {
                  setActiveConversationId(null);
                  setMessages([DEFAULT_WELCOME]);
                  setDocumentStatus(null);
                }
                deleteConversation(deletedConvId);
              }
            }}
            onDocumentClick={(doc) => {
              setShowDocLibrary(false);
              if (!doc.conversation_id) return;
              const targetCoach = doc.coach_type || 'learning';
              if (targetCoach === 'learning') {
                // Same coach — just load the conversation
                setActiveConversationId(doc.conversation_id);
              } else {
                // Different coach — navigate with conversation state
                navigate(`/${targetCoach}-coach`, {
                  state: { conversationId: doc.conversation_id }
                });
              }
            }}
          />
        </React.Suspense>
      )}

      {/* Main Full-Width Chat Shell */}
      <div className="chat-shell">
        <div className="chat-header-bar">
          <div className="chat-header-info">
            <IlmBotLogo size={32} showGlow={false} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px', color: '#FFF' }}>Learning Coach</div>
            </div>
          </div>

          <div className="chat-header-actions">
            <button
              className="tool-btn"
              onClick={() => setShowDocLibrary(true)}
              title="Manage uploaded documents & study library"
            >
              <DocumentIcon />
              <span>Doc Library</span>
            </button>

            <button
              className="tool-btn"
              onClick={handleNewChat}
              title="Start a new chat thread"
            >
              <PlusIcon />
              <span>New Chat</span>
            </button>

            <button
              className="tool-btn"
              onClick={exportChatToPDF}
              disabled={!hasExchangedMessages}
              title={hasExchangedMessages ? "Save conversation report as PDF" : "Start a conversation to save as PDF"}
            >
              <DownloadIcon />
              <span>Save as PDF</span>
            </button>

            <button
              className="tool-btn"
              onClick={handleOpenFlashcards}
              disabled={!hasExchangedMessages}
              title={hasExchangedMessages ? "Practice AI flashcards" : "Start a conversation to practice flashcards"}
            >
              <CardsIcon />
              <span>Flashcards</span>
            </button>
          </div>
        </div>

        {/* Inline Error Banner */}
        {errorBanner && (
          <div className="coach-error-banner">
            <span>⚠️ {errorBanner}</span>
            <button className="close-banner-btn" onClick={() => setErrorBanner(null)}>✕</button>
          </div>
        )}

        {/* Message Stream */}
        <div className="messages-container" ref={messagesContainerRef}>
          {messages.map((msg) => (
            <LearningMessageItem
              key={msg.id}
              msg={msg}
              apiBaseUrl={apiBaseUrl}
              onSwitchCoach={handleSwitchCoach}
            />
          ))}

          {/* Assistant Typing & Loading Bubble State */}
          {isThinking && (
            <div className="message-row ai thinking-row">
              <div className="msg-avatar ai-avatar">
                <IlmBotLogo size={20} showGlow={false} />
              </div>
              <div className="msg-bubble thinking-bubble">
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

        {/* Pending Image Attachment Bar */}
        {pendingImage && (
          <div className="pending-attachment-bar">
            <img src={pendingImage} alt="Attachment Preview" className="pending-thumb" />
            <span className="pending-filename">{pendingImageName || 'image_attachment.png'}</span>
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

        {documentStatus && (
          <div className={`pending-attachment-bar document-status-bar ${documentStatus.kind === 'success' ? 'document-status-success' : ''}`}>
            <span className="document-status-icon" aria-hidden="true">
              <DocumentIcon />
            </span>
            <span className="pending-filename">
              {documentStatus.kind === 'uploading'
                ? `${documentStatus.filename} · ${documentStatus.statusText || 'Uploading PDF…'}`
                : `${documentStatus.filename} · ${documentStatus.statusMessage || (documentStatus.extractionMethod === 'ocr' ? 'OCR Complete' : 'Text PDF detected')} · ${documentStatus.chunkCount} chunk${documentStatus.chunkCount === 1 ? '' : 's'}`}
            </span>
            {documentStatus.kind === 'success' && (
              <button
                className="remove-thumb-btn"
                title="Remove attached PDF"
                onClick={() => setDocumentStatus(null)}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Recording Visual Bar */}
        {isListening && (
          <div className="recording-status-bar">
            <span className="rec-pulse-dot"></span>
            <span className="rec-status-text">Listening... Speak your question clearly</span>
            <div className="waveform-lines">
              <span className="waveform-bar"></span>
              <span className="waveform-bar"></span>
              <span className="waveform-bar"></span>
              <span className="waveform-bar"></span>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="chat-input-bar">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImageSelect}
            disabled={isThinking}
          />
          <input
            type="file"
            accept="application/pdf,.pdf"
            ref={pdfInputRef}
            style={{ display: 'none' }}
            onChange={handlePdfSelect}
            disabled={isThinking || isUploadingDocument}
          />

          <div className="attach-menu-wrap" ref={attachMenuRef}>
            <button
              type="button"
              className={`icon-action-btn ${showAttachMenu ? 'attach-menu-open' : ''}`}
              title="Attach file"
              aria-label="Attach file"
              aria-expanded={showAttachMenu}
              aria-haspopup="menu"
              onClick={() => setShowAttachMenu((open) => !open)}
              disabled={isThinking || isUploadingDocument}
            >
              <PaperclipIcon />
            </button>
            {showAttachMenu && (
              <div className="attach-dropdown" role="menu">
                <button
                  type="button"
                  className="attach-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setShowAttachMenu(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <ImageIcon />
                  <span>Media</span>
                </button>
                <button
                  type="button"
                  className="attach-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setShowAttachMenu(false);
                    pdfInputRef.current?.click();
                  }}
                >
                  <DocumentIcon />
                  <span>Document</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`icon-action-btn ${isListening ? 'recording-active' : ''}`}
            aria-label={isListening ? "Stop Voice Input" : "Start Voice Input"}
            title={!isSpeechSupported ? "Voice input is not supported in this browser." : (isListening ? "Stop Voice Recording" : "Voice Input")}
            onClick={toggleVoiceRecord}
            disabled={isThinking}
          >
            <MicIcon />
          </button>

          <input
            type="text"
            ref={inputRef}
            className="chat-input-field"
            placeholder={
              isThinking
                ? "Learning Coach is thinking..."
                : isListening
                ? "Listening... Speak your question clearly..."
                : "Ask a question about any subject..."
            }
            value={inputText}
            disabled={isThinking}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
          />

          <button
            className="send-msg-btn"
            disabled={(!inputText.trim() && !pendingImage && !(documentStatus?.kind === 'success' && documentStatus.id)) || isThinking || isUploadingDocument}
            onClick={() => handleSend()}
            title="Send Message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
