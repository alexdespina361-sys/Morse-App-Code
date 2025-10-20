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
  const audioContextRef = useRef<any>(null);
  const oscillatorRef = useRef<any>(null);
  const gainNodeRef = useRef<any>(null);
  const timeoutsRef = useRef<any[]>([]);
  const [settings, setSettings] = useState({
    charWpm: 15,    // character speed
    effWpm: 5.4,    // effective (Farnsworth) speed
    frequency: 600,
    volume: 0.5,
    charSpaceDots: 3,
    wordSpaceDots: 7,
    groupSize: 4,
    ...initialSettings
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
      }
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  const initializeAudio = () => {
    if (isInitialized) return;
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
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

  const playTone = (durationSec: number) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;
    const now = audioContextRef.current.currentTime;
    const gain = gainNodeRef.current.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(0, now);
    gain.linearRampToValueAtTime(settings.volume, now + 0.01);
    gain.linearRampToValueAtTime(0, now + durationSec + 0.02);
  };

  const play = (text: string, onProgress: (i: number, isGroupEnd?: boolean) => void, onFinish: () => void) => {
    initializeAudio();
    stop();

    // Farnsworth timing
    const ditChar = 1200 / settings.charWpm;   // duration of dit at character speed
    const ditEff = 1200 / settings.effWpm;     // duration of dit at effective spacing speed
    const charSpace = ditEff * settings.charSpaceDots;
    const wordSpace = ditEff * settings.wordSpaceDots;
    const groupSize = settings.groupSize || 4;

    let delay = 0;
    let groupCount = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === ' ' || char === '\n') {
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay));
        delay += wordSpace;
        groupCount = 0;
        continue;
      }

      const code = MORSE_CODE[char.toUpperCase()];
      if (!code) {
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay));
        continue;
      }

      for (const symbol of code) {
        const durMs = symbol === '.' ? ditChar : ditChar * 3;
        timeoutsRef.current.push(setTimeout(() => playTone(durMs / 1000), delay));
        delay += durMs + ditEff; // intra-character spacing uses effective timing
      }

      groupCount++;
      const nextIsChar = i + 1 < text.length && text[i + 1] !== ' ' && text[i + 1] !== '\n';
      if (groupCount === groupSize && nextIsChar) {
        delay += ditEff; // extra group gap
        timeoutsRef.current.push(setTimeout(() => onProgress(i, true), delay));
        groupCount = 0;
      } else {
        delay += charSpace - ditEff;
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

  return { play, stop, updateSettings, initializeAudio, isInitialized, settings, setSettings };
};
