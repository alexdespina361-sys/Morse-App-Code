// New ./hooks/useMorsePlayer.tsx
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
      stop();
    };
  }, []);

  const initializeAudio = () => {
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
    setSettings((prev) => ({ ...prev, ...newSettings }));
    if (oscillatorRef.current) {
      if (newSettings.frequency) oscillatorRef.current.frequency.value = newSettings.frequency;
      // Volume update during play would require ramp
    }
  };

  const playTone = (duration) => {
    const now = audioContextRef.current.currentTime;
    gainNodeRef.current.gain.cancelScheduledValues(now);
    gainNodeRef.current.gain.setValueAtTime(0, now);
    gainNodeRef.current.gain.linearRampToValueAtTime(settings.volume, now + 0.01);
    gainNodeRef.current.gain.linearRampToValueAtTime(0, now + duration / 1000 + 0.01);
  };

  const play = (text, onProgress, onFinish) => {
    if (!isInitialized) initializeAudio();
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const ditLength = 1200 / settings.wpm; // ms per dit
    const charSpace = ditLength * settings.charSpaceDots;
    const wordSpace = ditLength * settings.wordSpaceDots;

    let index = 0;
    let delay = 0;
    for (const char of text) {
      if (char === ' ') {
        delay += wordSpace;
        continue;
      }
      const code = MORSE_CODE[char.toUpperCase()];
      if (!code) continue;

      for (const symbol of code) {
        const duration = symbol === '.' ? ditLength : ditLength * 3;
        timeoutsRef.current.push(setTimeout(() => playTone(duration), delay));
        delay += duration + ditLength; // intra-char space
      }
      delay += charSpace - ditLength; // inter-char space
      timeoutsRef.current.push(setTimeout(() => onProgress(index), delay - (charSpace - ditLength)));
      index++;
    }
    timeoutsRef.current.push(setTimeout(onFinish, delay));
  };

  const stop = () => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
      gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close().then(() => {
        audioContextRef.current = null;
        oscillatorRef.current = null;
        gainNodeRef.current = null;
        setIsInitialized(false);
      });
    }
  };

  return { play, stop, updateSettings, initializeAudio, isInitialized };
};
