'use client';

import styles from './SpeakerButton.module.css';

function normalizeSpeechText(value) {
  return String(value ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function speakText(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const cleanText = normalizeSpeechText(text);
  if (!cleanText) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

export default function SpeakerButton({ text, className = '' }) {
  return (
    <button
      type="button"
      className={`${styles.speakerButton} ${className}`.trim()}
      onClick={() => speakText(text)}
      aria-label="Read question text aloud"
      title="Read aloud"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.speakerIcon}>
        <path
          d="M3 10v4h4l5 4V6L7 10H3zm12.5 2a3.5 3.5 0 0 0-2-3.15v6.3A3.5 3.5 0 0 0 15.5 12zm0-7a1 1 0 1 0 0 2 5 5 0 0 1 0 10 1 1 0 1 0 0 2 7 7 0 0 0 0-14z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
