// Updated ./hooks/useMorsePlayer.tsx
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
    stop();

    const dit = 1200 / settings.wpm;
    const charSpace = dit * settings.charSpaceDots;
    const wordSpace = dit * settings.wordSpaceDots;
    const groupSize = settings.groupSize;

    let index = 0;
    let delay = 0;
    let groupCount = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === ' ' || char === '\n') {
        if (i > 0) {
          timeoutsRef.current.push(setTimeout(() => onProgress(i - 1), delay));
        }
        delay += wordSpace;
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay));
        groupCount = 0; // Reset group on word break
        continue;
      }

      const code = MORSE_CODE[char.toUpperCase()];
      if (!code) {
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay));
        continue;
      }

      const charStartDelay = delay;
      for (const symbol of code) {
        const durMs = symbol === '.' ? dit : dit * 3;
        timeoutsRef.current.push(setTimeout(() => playTone(durMs / 1000), delay));
        delay += durMs + dit;
      }

      // Schedule group break if needed
      groupCount++;
      if (groupCount === groupSize && i + 1 < text.length && text[i + 1] !== ' ' && text[i + 1] !== '\n') {
        delay += dit; // Add space between groups
        timeoutsRef.current.push(setTimeout(() => onProgress(i, true), delay)); // Mark group end
        groupCount = 0;
      } else if (i + 1 === text.length || text[i + 1] === ' ' || text[i + 1] === '\n') {
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay)); // Last char or word end
        groupCount = 0;
      } else {
        delay += charSpace - dit;
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay));
      }
    }

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
