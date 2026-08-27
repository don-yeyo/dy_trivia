import React, { useState, useEffect } from 'react';
import { sounds } from '../services/soundEffects';

const COUNTDOWN_STEPS = [
  { text: '¡Preparate!', isWord: true, duration: 750 },
  { text: '5', isWord: false, duration: 650 },
  { text: '4', isWord: false, duration: 650 },
  { text: '3', isWord: false, duration: 650 },
  { text: '¡Listos!', isWord: true, duration: 700 },
  { text: '2', isWord: false, duration: 650 },
  { text: '1', isWord: false, duration: 650 },
  { text: '¡YA!', isWord: true, duration: 650, isFinal: true }
];

export default function CountdownIntro({ onCountdownComplete }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const current = COUNTDOWN_STEPS[stepIndex];
    if (!current) return;

    // Reproducir sonido
    if (current.isFinal) {
      sounds.playGoSound();
    } else {
      sounds.playCountdownTick();
    }

    const timer = setTimeout(() => {
      if (stepIndex + 1 < COUNTDOWN_STEPS.length) {
        setStepIndex(prev => prev + 1);
      } else {
        onCountdownComplete();
      }
    }, current.duration);

    return () => clearTimeout(timer);
  }, [stepIndex, onCountdownComplete]);

  const currentItem = COUNTDOWN_STEPS[stepIndex] || COUNTDOWN_STEPS[0];

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center text-center z-20 py-12 select-none pointer-events-none">
      <div
        key={stepIndex}
        className="countdown-bubble-item"
      >
        <div className={`countdown-text ${currentItem.isWord ? 'countdown-word' : 'countdown-number'}`}>
          {currentItem.text}
        </div>
      </div>
    </div>
  );
}
