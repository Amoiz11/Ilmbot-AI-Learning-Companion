import React from 'react';

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const ArrowRightIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="-2 -2 28 28"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ overflow: 'visible', flexShrink: 0, display: 'block' }}
  >
    <line x1="4" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5252" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

const RefreshCwIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const AwardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7"></circle>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
  </svg>
);

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const TargetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
);

export default function QuizModule({
  sessionId,
  activeQuestions,
  currentQuestionIndex,
  userAnswers,
  quizSubmitted,
  quizError,
  submissionResult,
  handleOptionSelect,
  handleNextQuestion,
  handleRetakeQuiz,
  fetchQuizQuestions,
  navigate,
  calculateScore,
  onExitQuiz
}) {
  if (quizError && !quizSubmitted && activeQuestions.length === 0) {
    return (
      <div className="quiz-active-container">
        <div className="glass-panel quiz-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', textAlign: 'center' }}>
          <AlertTriangleIcon />
          <h3 style={{ color: '#FF8080', margin: 0 }}>Quiz Generation Error</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: 0 }}>{quizError}</p>
          <button className="primary-action-btn" onClick={() => fetchQuizQuestions(sessionId)} style={{ marginTop: '8px' }}>
            <RefreshCwIcon />
            <span>Retry Quiz Generation</span>
          </button>
        </div>
      </div>
    );
  }

  if (!quizSubmitted) {
    const q = activeQuestions[currentQuestionIndex];
    const selectedOpt = userAnswers[currentQuestionIndex];
    const isAnswered = selectedOpt !== undefined;

    return (
      <div className="quiz-active-container">
        {/* Quiz Header Bar */}
        <div className="quiz-top-bar">
          <button className="back-btn" onClick={onExitQuiz || (() => navigate(sessionId ? `/smart-revision/${sessionId}` : '/smart-revision'))}>
            <ArrowLeftIcon />
            <span>Exit Quiz</span>
          </button>

          <div className="quiz-progress-wrapper">
            <span className="progress-text">
              Question {currentQuestionIndex + 1} of {activeQuestions.length}
            </span>
            <div className="quiz-progress-track">
              <div
                className="quiz-progress-fill"
                style={{
                  width: `${((currentQuestionIndex + 1) / (activeQuestions.length || 1)) * 100}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Active Question Card */}
        {q && (
          <div className="glass-panel quiz-card">
            <div className="question-header">
              <span className="question-chip">Question {currentQuestionIndex + 1}</span>
              <h2 className="question-text">{q.question}</h2>
            </div>

            {/* Options Grid */}
            <div className="options-grid">
              {q.options.map((optionText, optIdx) => {
                let optionClass = 'option-btn';

                if (isAnswered) {
                  if (optIdx === q.correct) {
                    optionClass += ' correct-option';
                  } else if (optIdx === selectedOpt) {
                    optionClass += ' incorrect-option';
                  } else {
                    optionClass += ' disabled-option';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    className={optionClass}
                    onClick={() => handleOptionSelect(optIdx)}
                    disabled={isAnswered}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="option-text">{optionText}</span>

                    {isAnswered && optIdx === q.correct && (
                      <span className="feedback-icon-badge correct-badge">
                        <CheckCircleIcon /> Correct
                      </span>
                    )}

                    {isAnswered && optIdx === selectedOpt && optIdx !== q.correct && (
                      <span className="feedback-icon-badge incorrect-badge">
                        <XCircleIcon /> Incorrect
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Explanation Box */}
            {isAnswered && (
              <div className="explanation-box">
                <div className="explanation-header">
                  <SparklesIcon />
                  <span>AI Feedback & Explanation:</span>
                </div>
                <p>{q.explanation}</p>
              </div>
            )}

            {/* Next / Finish Button */}
            <div className="quiz-bottom-actions">
              <button
                className="next-question-btn"
                disabled={!isAnswered}
                onClick={handleNextQuestion}
              >
                <span>
                  {currentQuestionIndex === activeQuestions.length - 1
                    ? 'View Quiz Results'
                    : 'Next Question'}
                </span>
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* RESULTS / PERFORMANCE FEEDBACK SCREEN */
  return (
    <div className="glass-panel results-card">
      <div className="results-badge-row">
        <div className="score-ring-wrapper">
          <AwardIcon />
          <span className="score-number">
            {calculateScore()} / {activeQuestions.length}
          </span>
          <span className="score-percent">
            {Math.round((calculateScore() / (activeQuestions.length || 1)) * 100)}% Accuracy
          </span>
        </div>
      </div>

      <h1 className="results-title">Quiz Performance Summary</h1>
      <p className="results-feedback-msg">
        {calculateScore() === activeQuestions.length
          ? "🎉 Flawless Score! You have mastered all core concepts of this topic!"
          : calculateScore() >= activeQuestions.length * 0.7
          ? "Great job! You demonstrated a strong grasp of the material. Review the missed points below."
          : "Good effort! Take a quick look through the revision material once more to solidify key concepts."}
      </p>

      {/* Weak Areas Diagnostic Section */}
      <div className="results-weak-areas">
        <h3 className="breakdown-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TargetIcon />
          <span>Diagnostic Weak Areas & Concepts to Review</span>
        </h3>
        {submissionResult?.weakAreas && submissionResult.weakAreas.length > 0 ? (
          <div className="weak-areas-list">
            {submissionResult.weakAreas.map((area, idx) => (
              <span key={idx} className="weak-area-pill">
                <AlertTriangleIcon /> {area}
              </span>
            ))}
          </div>
        ) : calculateScore() === activeQuestions.length ? (
          <div className="perfect-mastery-banner">
            <SparklesIcon />
            <span>Perfect Score! No weak areas detected — concept mastery achieved.</span>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', margin: 0 }}>
            Review the missed questions in the breakdown below to reinforce key concepts.
          </p>
        )}
      </div>

      {/* Review Breakdown */}
      <div className="results-breakdown">
        <h3 className="breakdown-title">Question Breakdown</h3>
        <div className="breakdown-list">
          {activeQuestions.map((q, idx) => {
            const userOpt = userAnswers[idx];
            const isCorrect = userOpt === q.correct;

            return (
              <div key={idx} className={`breakdown-item ${isCorrect ? 'item-correct' : 'item-incorrect'}`}>
                <div className="breakdown-item-header">
                  <span className="q-num">Q{idx + 1}.</span>
                  <span className="q-title">{q.question}</span>
                  {isCorrect ? (
                    <span className="badge-pass">Correct</span>
                  ) : (
                    <span className="badge-fail">Incorrect</span>
                  )}
                </div>
                <div className="breakdown-details">
                  <p><strong>Your Answer:</strong> {userOpt !== undefined && q.options[userOpt] !== undefined ? q.options[userOpt] : 'Skipped'}</p>
                  {!isCorrect && <p className="correct-line"><strong>Correct Answer:</strong> {q.options[q.correct]}</p>}
                  <p className="explanation-line"><em>{q.explanation}</em></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Action Buttons */}
      <div className="results-actions">
        <button className="secondary-action-btn" onClick={handleRetakeQuiz}>
          <RefreshCwIcon />
          <span>Retake Quiz</span>
        </button>
        <button className="primary-action-btn" onClick={onExitQuiz || (() => navigate('/smart-revision'))}>
          <span>Back to Smart Revision</span>
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}
