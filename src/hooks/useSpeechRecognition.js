import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useSpeechRecognition
 * Custom hook wrapping browser native Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 *
 * Exposes:
 * - isSupported: boolean
 * - isListening: boolean
 * - transcript: string
 * - error: string | null
 * - startListening: () => void
 * - stopListening: () => void
 */
export function useSpeechRecognition({ onTranscript, onEnd, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const isExplicitStopRef = useRef(false);
  const hasCapturedSpeechRef = useRef(false);
  const hasErrorOccurredRef = useRef(false);
  const isDiscardingResultsRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  });

  const isSupported = typeof window !== 'undefined' && Boolean(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );

  const stopListening = useCallback(() => {
    isExplicitStopRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped or inactive
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    hasCapturedSpeechRef.current = false;
  }, []);

  const abortListening = useCallback(() => {
    isExplicitStopRef.current = true;
    isDiscardingResultsRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore if already stopped or inactive
      }
    }
    setTranscript('');
    hasCapturedSpeechRef.current = false;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    hasCapturedSpeechRef.current = false;
    hasErrorOccurredRef.current = false;
    isExplicitStopRef.current = false;
    isDiscardingResultsRef.current = false;

    if (!isSupported) {
      const unsupportedErr = "Voice input is not supported in this browser.";
      setError(unsupportedErr);
      onErrorRef.current?.(unsupportedErr);
      return;
    }

    // Terminate any previous instance before creating a new one
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      if (isDiscardingResultsRef.current) return;

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interimTranscript += res[0].transcript;
        }
      }

      const fullLiveTranscript = (
        finalTranscript + (interimTranscript ? (finalTranscript ? ' ' : '') + interimTranscript : '')
      ).trim();

      if (fullLiveTranscript) {
        hasCapturedSpeechRef.current = true;
        setTranscript(fullLiveTranscript);
        onTranscriptRef.current?.(fullLiveTranscript);
      }
    };

    recognition.onerror = (event) => {
      if (isDiscardingResultsRef.current) return;

      hasErrorOccurredRef.current = true;
      let errMsg = null;

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errMsg = "Microphone permission denied. Please enable microphone access.";
      } else if (event.error === 'no-speech') {
        errMsg = "No speech detected. Try again.";
      } else if (event.error === 'network') {
        errMsg = "Network error during speech recognition. Try again.";
      } else if (event.error !== 'aborted') {
        errMsg = `Speech recognition error: ${event.error}`;
      }

      if (errMsg) {
        setError(errMsg);
        onErrorRef.current?.(errMsg);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isDiscardingResultsRef.current) {
        return;
      }
      // If recognition ended naturally with no error, no speech captured, and not an intentional manual stop
      if (!hasErrorOccurredRef.current && !hasCapturedSpeechRef.current && !isExplicitStopRef.current) {
        const noSpeechErr = "No speech detected. Try again.";
        setError(noSpeechErr);
        onErrorRef.current?.(noSpeechErr);
      }
      onEndRef.current?.();
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn('Failed to start SpeechRecognition:', err);
      const startErr = "Microphone permission denied. Please enable microphone access.";
      setError(startErr);
      onErrorRef.current?.(startErr);
      setIsListening(false);
    }
  }, [isSupported]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    abortListening,
    resetTranscript
  };
}

export default useSpeechRecognition;
