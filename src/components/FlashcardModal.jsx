import React, { useState, useEffect } from 'react';
import IlmBotLogo from './IlmBotLogo';
import './FlashcardModal.css';

const CardsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="14" height="14" rx="2"></rect>
    <path d="M17 14h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"></path>
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

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

export default function FlashcardModal({
  isOpen,
  onClose,
  cards = [],
  theme = 'learning',
  title = 'Generated Study Flashcards',
  isLoading = false,
  isGenerating = false,
  error = null,
  onGenerate = null,
  onRegenerate = null,
  canGenerate = true,
  emptyMessage = null
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset index and flip status whenever modal opens or card list changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [isOpen, cards]);

  // Ensure flip state always resets back to question side whenever card index changes
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  // Keyboard accessibility
  useEffect(() => {
    if (!isOpen || isLoading || isGenerating || cards.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (e.target.tagName !== 'BUTTON') {
          e.preventDefault();
          setIsFlipped(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, cards.length, isLoading, isGenerating]);

  if (!isOpen) {
    return null;
  }

  const currentCard = cards[currentIndex] || {};
  const question = currentCard.front || currentCard.question || '';
  const answer = currentCard.back || currentCard.answer || '';
  const tag = currentCard.tag || (theme === 'coding' ? 'Coding • Active Recall' : 'Concept • Active Recall');

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex === cards.length - 1) {
      onClose();
    } else {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const isLastCard = currentIndex === cards.length - 1;
  const triggerGenerate = onGenerate || onRegenerate;

  return (
    <div
      className="flashcards-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`flashcard-modal-panel theme-${theme}`}>
        {/* Modal Header */}
        <div className="flashcard-modal-header">
          <div className="flashcard-modal-title">
            <CardsIcon />
            <span>{title}</span>
            {cards.length > 0 && !isGenerating && !isLoading && (
              <span className="flashcard-count-badge">{cards.length} Cards</span>
            )}
          </div>
          <button
            className="close-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* BODY STATES */}
        {isGenerating ? (
          /* Generating State */
          <div className="flashcard-modal-state">
            <div className={`flashcard-spinner theme-${theme}`}></div>
            <h4 className="state-heading">Generating 5 Study Flashcards...</h4>
            <p className="state-desc">
              Synthesizing key questions, code concepts, and exam takeaways from your study session with AI.
            </p>
          </div>
        ) : isLoading ? (
          /* Loading State */
          <div className="flashcard-modal-state">
            <div className={`flashcard-spinner theme-${theme}`}></div>
            <p className="state-desc">Checking for saved study flashcards...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flashcard-modal-state">
            <div className="state-icon-error">⚠️</div>
            <h4 className="state-heading" style={{ color: '#F87171' }}>Generation Error</h4>
            <p className="state-desc" style={{ color: '#FCA5A5' }}>{error}</p>
            {triggerGenerate && (
              <button
                className={`flashcard-btn-primary theme-${theme}`}
                onClick={triggerGenerate}
              >
                <RefreshIcon />
                <span>Try Again</span>
              </button>
            )}
          </div>
        ) : cards.length === 0 ? (
          /* Empty / Not Generated Yet State */
          <div className="flashcard-modal-state">
            <div className="state-icon-cards">
              <CardsIcon />
            </div>
            <h4 className="state-heading">No Flashcards Yet</h4>
            <p className="state-desc">
              {emptyMessage || (canGenerate
                ? "Generate 5 personalized AI active recall flashcards based on this study session's conversation."
                : "Ask questions or discuss code with your coach first to generate study flashcards!")}
            </p>
            {canGenerate && triggerGenerate && (
              <button
                className={`flashcard-btn-primary theme-${theme}`}
                onClick={triggerGenerate}
              >
                <CardsIcon />
                <span>Generate 5 Flashcards</span>
              </button>
            )}
          </div>
        ) : (
          /* Ready: 3D Interactive Flip Card */
          <>
            <div
              className="flashcard-3d-wrapper"
              onClick={() => setIsFlipped(prev => !prev)}
              tabIndex={0}
              role="button"
              aria-label={isFlipped ? "Flip to question" : "Flip to answer"}
            >
              <div key={currentIndex} className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
                {/* Front of Card */}
                <div className="flashcard-front">
                  <span className="card-tag">{tag}</span>
                  <div className="card-question">{question}</div>
                  <div className="card-flip-prompt">Click card to flip & reveal answer 🔄</div>
                  <div className="card-watermark">
                    <IlmBotLogo size={140} showGlow={false} />
                  </div>
                </div>

                {/* Back of Card */}
                <div className="flashcard-back">
                  <span className="card-tag">Answer & Explanation</span>
                  <div className="card-answer">{answer}</div>
                  <div className="card-flip-prompt">Click card to flip back 🔄</div>
                  <div className="card-watermark">
                    <IlmBotLogo size={140} showGlow={false} />
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flashcard-nav">
              <button
                className="card-nav-btn"
                disabled={currentIndex === 0}
                onClick={handlePrev}
                aria-label="Previous card"
              >
                <ChevronLeftIcon /> Prev
              </button>

              <span className="nav-counter">
                Card {currentIndex + 1} of {cards.length}
              </span>

              <button
                className="card-nav-btn"
                onClick={handleNext}
                aria-label={isLastCard ? "Finish flashcards" : "Next card"}
              >
                {isLastCard ? (
                  <span>Finish</span>
                ) : (
                  <>
                    Next <ChevronRightIcon />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
