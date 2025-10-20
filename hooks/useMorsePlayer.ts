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
      if (oscillatorRef.current && gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        oscillatorRef.current.disconnect();
        gainNodeRef.current.disconnect();
        audioContextRef.current.close();
      }
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
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
    gainNodeRef.current.connect(audioContextRef.current.destination);
    oscillatorRef.current.start();

    // Add compressor to prevent clipping
    const compressor = audioContextRef.current.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    gainNodeRef.current.connect(compressor);
    compressor.connect(audioContextRef.current.destination);

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
    gainNodeRef.current.gain.setTargetAtTime(settings.volume, now, 0.001);
    timeoutsRef.current.push(setTimeout(() => {
      gainNodeRef.current.gain.setTargetAtTime(0, audioContextRef.current.currentTime, 0.001);
    }, duration * 1000));
  };

  const play = (text, onProgress, onFinish) => {
    initializeAudio();
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const ditLength = 1200 / settings.wpm; // ms per dit
    const charSpace = ditLength * settings.charSpaceDots;
    const wordSpace = ditLength * settings.wordSpaceDots;

    let index = 0;
    const schedule = () => {
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
          timeoutsRef.current.push(setTimeout(() => playTone(duration / 1000), delay));
          delay += duration + ditLength; // intra-char space
        }
        delay += charSpace - ditLength; // inter-char space
        onProgress(index);
        index++;
      }
      timeoutsRef.current.push(setTimeout(onFinish, delay));
    };
    schedule();
  };

  const stop = () => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(0, audioContextRef.current.currentTime, 0.001);
    }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  return { play, stop, updateSettings, initializeAudio, isInitialized };
};
