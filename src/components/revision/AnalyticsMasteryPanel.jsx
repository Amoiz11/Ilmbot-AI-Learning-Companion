import React from 'react';

const AwardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7"></circle>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
  </svg>
);

export default function AnalyticsMasteryPanel({ topicMastery, recentLogs, isLoadingQuizHistory }) {
  return (
    <section className="glass-panel analytics-section">
      <div className="analytics-header">
        <div className="analytics-title-group">
          <AwardIcon />
          <h2>Learning Analytics & Mastery</h2>
        </div>
        <span className="analytics-subtitle">Track your recall retention and quiz history</span>
      </div>

      <div className="analytics-grid">
        {/* Topic Performance Bars */}
        <div className="analytics-card">
          <h3 className="card-subheading">Topic Mastery Accuracy</h3>
          {isLoadingQuizHistory && topicMastery.length === 0 ? (
            <div className="analytics-empty-state">
              <p>Loading topic mastery...</p>
            </div>
          ) : topicMastery.length === 0 ? (
            <div className="analytics-empty-state">
              <p>No quiz data available yet</p>
              <span className="analytics-empty-hint">Take a practice quiz below to measure topic mastery</span>
            </div>
          ) : (
            <div className="mastery-list">
              {topicMastery.map((item) => (
                <div key={item.topic} className="mastery-item">
                  <div className="mastery-info">
                    <span className="mastery-label" title={item.topic}>{item.topic}</span>
                    <span className="mastery-value" style={{ color: item.color }}>{item.percent}%</span>
                  </div>
                  <div className="mastery-track">
                    <div
                      className="mastery-fill"
                      style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revision & Quiz History */}
        <div className="analytics-card">
          <h3 className="card-subheading">Recent Revision Logs</h3>
          {isLoadingQuizHistory && recentLogs.length === 0 ? (
            <div className="analytics-empty-state">
              <p>Loading revision logs...</p>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="analytics-empty-state">
              <p>No revision logs yet</p>
              <span className="analytics-empty-hint">Complete a practice quiz below to view logs</span>
            </div>
          ) : (
            <ul className="history-list">
              {recentLogs.map((log) => (
                <li key={log.id} className="history-item">
                  <div className="history-topic">
                    <span className="history-bullet"></span>
                    <span className="history-title" title={log.topic}>{log.topic}</span>
                  </div>
                  <div className="history-badge-group">
                    <span className="history-score">{log.score}</span>
                    <span className="history-date">{log.date}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
