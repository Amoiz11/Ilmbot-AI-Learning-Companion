import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './DocumentLibraryModal.css';

const DocumentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

function formatDocDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
}

export default function DocumentLibraryModal({
  isOpen,
  onClose,
  onDocumentDeleted,
  onDocumentClick,
}) {
  const { token: authContextToken } = useAuth();
  const token = authContextToken || localStorage.getItem('ilmbot_google_token');
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchDocuments = useCallback(async () => {
    const activeToken = token || localStorage.getItem('ilmbot_google_token');
    if (!activeToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to load documents');
      }
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Unable to load document library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
      setConfirmDeleteId(null);
    }
  }, [isOpen, fetchDocuments]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmDeleteId, onClose]);

  const handleDelete = async (docId, convId) => {
    const activeToken = token || localStorage.getItem('ilmbot_google_token');
    if (!activeToken) return;
    setDeletingId(docId);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Unable to delete document.');
      }
      const data = await res.json().catch(() => ({}));
      const deletedConvId = data.deleted_conversation_id || convId;
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setConfirmDeleteId(null);
      if (onDocumentDeleted) {
        onDocumentDeleted(docId, deletedConvId);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div
        className="doc-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-modal-title"
      >
        {/* Header */}
        <div className="doc-modal-header">
          <div className="doc-modal-title-group">
            <div className="doc-modal-badge-icon">
              <DocumentIcon />
            </div>
            <div>
              <h2 id="doc-modal-title" className="doc-modal-title">Document Library</h2>
              <p className="doc-modal-subtitle">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'} available for RAG knowledge retrieval
              </p>
            </div>
          </div>
          <div className="doc-modal-actions">
            <button
              className="doc-refresh-btn"
              onClick={fetchDocuments}
              disabled={isLoading}
              title="Refresh library"
            >
              <RefreshIcon />
            </button>
            <button className="doc-modal-close" onClick={onClose} aria-label="Close modal">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="doc-modal-error">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Body */}
        <div className="doc-modal-body">
          {isLoading ? (
            <div className="doc-modal-loading">
              <div className="doc-spinner" />
              <span>Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="doc-modal-empty">
              <div className="doc-empty-icon">
                <DocumentIcon />
              </div>
              <h3>No documents uploaded yet</h3>
              <p>
                Upload textbooks, lecture notes, or syllabi via the paperclip menu in Learning Coach to enable smart RAG answering.
              </p>
            </div>
          ) : (
            <div className="doc-items-list">
              {documents.map((doc) => {
                const isConfirming = confirmDeleteId === doc.id;
                const isDeleting = deletingId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className={`doc-item-wrapper ${isConfirming ? 'doc-item-confirming' : ''}`}
                  >
                    <div
                      className={`doc-card ${doc.conversation_id && !isConfirming ? 'doc-card-clickable' : ''}`}
                      onClick={() => {
                        if (!isConfirming && doc.conversation_id && onDocumentClick) {
                          onDocumentClick(doc);
                        }
                      }}
                      title={!isConfirming && doc.conversation_id ? 'Click to open conversation' : undefined}
                    >
                      <div className="doc-card-info">
                        <div className="doc-card-icon">
                          <DocumentIcon />
                        </div>
                        <div className="doc-card-details">
                          <span className="doc-card-filename" title={doc.filename}>
                            {doc.filename}
                          </span>
                          <div className="doc-card-meta">
                            <span className="doc-meta-badge">
                              {doc.chunk_count || doc.chunkCount || 0} chunks
                            </span>
                            <span className="doc-meta-dot">•</span>
                            <span className="doc-meta-date">
                              {formatDocDate(doc.uploaded_at || doc.uploadedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="doc-card-actions" onClick={(e) => e.stopPropagation()}>
                        {!isConfirming && (
                          <button
                            className="doc-btn-delete"
                            onClick={() => setConfirmDeleteId(doc.id)}
                            disabled={isDeleting}
                            title="Delete document"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>

                    {isConfirming && (
                      <div className="doc-confirm-banner" onClick={(e) => e.stopPropagation()}>
                        <div className="doc-confirm-banner-content">
                          <span className="doc-confirm-warning-icon">⚠️</span>
                          <div className="doc-confirm-warning-text">
                            <strong>
                              {doc.conversation_id ? 'Delete document & associated chat?' : 'Delete document?'}
                            </strong>
                            <span>
                              {doc.conversation_id
                                ? 'Deleting this document will also permanently delete its linked chat conversation.'
                                : 'Are you sure you want to permanently delete this document?'}
                            </span>
                          </div>
                        </div>
                        <div className="doc-confirm-banner-actions">
                          <button
                            className="doc-btn-confirm-delete"
                            onClick={() => handleDelete(doc.id, doc.conversation_id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Deleting...' : (doc.conversation_id ? 'Delete Both' : 'Delete')}
                          </button>
                          <button
                            className="doc-btn-cancel-delete"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
