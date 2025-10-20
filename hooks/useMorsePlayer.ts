import { useEffect, useRef, useState } from 'react';

const MORSE_CODE = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.', ' ': ' '
};

export const useMorsePlayer = (initialSettings) => {
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const timeoutsRef = useRef([]);
  const [settings, setSettings] = useState(initialSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    return () => {
      // Clean shutdown ONLY on unmount
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const initializeAudio = () => {
    if (isInitialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();

    oscillatorRef.current = audioContextRef.current.createOscillator();
    gainNodeRef.current = audioContextRef.current.createGain();

    oscillatorRef.current.type = 'sine';
    oscillatorRef.current.frequency.value = settings.frequency;
    gainNodeRef.current.gain.value = 0;
    oscillatorRef.current.connect(gainNodeRef.current);

    // Add compressor to prevent clipping
    const compressor = audioContextRef.current.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    gainNodeRef.current.connect(compressor);
    compressor.connect(audioContextRef.current.destination);

    oscillatorRef.current.start();
    setIsInitialized(true);
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    if (oscillatorRef.current && newSettings.frequency) {
      oscillatorRef.current.frequency.value = newSettings.frequency;
    }
  };

  const playTone = (durationSec) => {
    const now = audioContextRef.current.currentTime;
    const gain = gainNodeRef.current.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(0, now);
    gain.linearRampToValueAtTime(settings.volume, now + 0.01);
    gain.linearRampToValueAtTime(0, now + durationSec + 0.02);
  };

  const play = (text, onProgress, onFinish) => {
  initializeAudio();
  stop(); // prevent overlap

  const dit = 1200 / settings.wpm;
  const charSpace = dit * settings.charSpaceDots;
  const wordSpace = dit * settings.wordSpaceDots;

  let index = 0;
  let delay = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === ' ' || char === '\n') {
      // Word break - call onProgress for previous character first, then schedule space
      if (i > 0) {
        timeoutsRef.current.push(setTimeout(() => onProgress(index - 1), delay));
      }
      delay += wordSpace;
      timeoutsRef.current.push(setTimeout(() => onProgress(i), delay)); // Progress for space
      continue;
    }

    const code = MORSE_CODE[char.toUpperCase()];
    if (!code) {
      timeoutsRef.current.push(setTimeout(() => onProgress(i), delay));
      continue;
    }

    // Schedule character completion AFTER all its morse symbols
    const charStartDelay = delay;
    for (const symbol of code) {
      const durMs = symbol === '.' ? dit : dit * 3;
      timeoutsRef.current.push(setTimeout(() => playTone(durMs / 1000), delay));
      delay += durMs + dit; // symbol + intra-char space
    }
    
    // Call onProgress when character COMPLETES (after last symbol + inter-char space)
    const charEndDelay = delay + (charSpace - dit);
    timeoutsRef.current.push(setTimeout(() => onProgress(i), charEndDelay));
    delay = charEndDelay;
    index++;
  }

  // Final onFinish
  timeoutsRef.current.push(setTimeout(onFinish, delay));
};

  const stop = () => {
    if (gainNodeRef.current && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      gainNodeRef.current.gain.cancelScheduledValues(now);
      gainNodeRef.current.gain.setTargetAtTime(0, now, 0.02);
    }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  return { play, stop, updateSettings, initializeAudio, isInitialized };
};
