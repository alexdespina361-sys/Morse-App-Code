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
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timeoutsRef = useRef<any[]>([]);
  const [settings, setSettings] = useState(initialSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    return () => {
      stop(); // Clean stop on unmount
    };
  }, []);

  const initializeAudio = () => {
    if (audioContextRef.current) return;

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

  const playTone = (duration: number) => {
    const now = audioContextRef.current!.currentTime;
    const gain = gainNodeRef.current!.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(0, now);
    gain.linearRampToValueAtTime(settings.volume, now + 0.01);
    gain.linearRampToValueAtTime(0, now + duration / 1000 + 0.01);
  };

  const play = (text, onProgress, onFinish) => {
    if (!isInitialized) initializeAudio();
    stop();

    const dit = 1200 / settings.wpm;
    const charSpace = dit * settings.charSpaceDots;
    const wordSpace = dit * settings.wordSpaceDots;

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
        const duration = symbol === '.' ? dit : dit * 3;
        timeoutsRef.current.push(setTimeout(() => playTone(duration), delay));
        delay += duration + dit;
      }

      timeoutsRef.current.push(setTimeout(() => onProgress(index), delay));
      delay += charSpace - dit;
      index++;
    }

    timeoutsRef.current.push(setTimeout(onFinish, delay));
  };

  const stop = () => {
    const now = audioContextRef.current?.currentTime;
    if (gainNodeRef.current && now) {
      gainNodeRef.current.gain.cancelScheduledValues(now);
      gainNodeRef.current.gain.setTargetAtTime(0, now, 0.02); // Smooth fade
    }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  return { play, stop, updateSettings, initializeAudio, isInitialized };
};
