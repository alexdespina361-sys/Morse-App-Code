import { useEffect, useRef, useState } from 'react';

const MORSE_CODE: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.', ' ': ' '
};

export const useMorsePlayer = (initialSettings: any) => {
  const audioContextRef = useRef<any>(null);
  const oscillatorRef = useRef<any>(null);
  const gainNodeRef = useRef<any>(null);
  const timeoutsRef = useRef<any[]>([]);
  const [settings, setSettings] = useState({
    wpm: initialSettings.wpm || 18,
    frequency: initialSettings.frequency || 600,
    volume: initialSettings.volume || 0.5,
    charSpaceDots: initialSettings.charSpaceDots || 3,
    wordSpaceDots: initialSettings.wordSpaceDots || 7,
    groupSize: initialSettings.groupSize || 4,
    totalChars: initialSettings.totalChars || 120,
    ...initialSettings
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Calculate effective WPM with Farnsworth
  const effectiveWpm = (() => {
    const dotTime = 1.2 / settings.wpm; // seconds per dot
    const charUnitTime = dotTime * 5; // standard 5 units per character
    const farnsworthUnit = dotTime * (settings.charSpaceDots / 3); // adjust for extra spacing
    const eff = 1.2 / (charUnitTime / settings.charSpaceDots); // simplified effective WPM
    return Math.min(settings.wpm, settings.wpm * (1 - (settings.charSpaceDots - 3) / 10)); 
  })();

  // Cleanup on unmount
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

  const updateSettings = (newSettings: any) => {
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
    gain.linearRampToValueAtTime(settings.volume, now + 0.005);
    gain.linearRampToValueAtTime(0, now + durationSec);
  };

  const play = (text: string, onProgress: (i: number, isGroupEnd?: boolean) => void, onFinish: () => void) => {
    initializeAudio();
    stop();

    const dotTime = 1.2 / settings.wpm; // seconds per dot
    const charSpace = dotTime * settings.charSpaceDots;
    const wordSpace = dotTime * settings.wordSpaceDots;

    let delay = 0;
    let groupCount = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === ' ' || char === '\n') {
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay * 1000));
        delay += wordSpace;
        groupCount = 0;
        continue;
      }

      const code = MORSE_CODE[char.toUpperCase()];
      if (!code) {
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay * 1000));
        continue;
      }

      for (const symbol of code) {
        const durSec = symbol === '.' ? dotTime : dotTime * 3;
        timeoutsRef.current.push(setTimeout(() => playTone(durSec), delay * 1000));
        delay += durSec + dotTime; // intra-character spacing
      }

      groupCount++;
      if (groupCount === settings.groupSize) {
        delay += charSpace;
        timeoutsRef.current.push(setTimeout(() => onProgress(i, true), delay * 1000));
        groupCount = 0;
      } else {
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay * 1000));
      }
    }

    timeoutsRef.current.push(setTimeout(onFinish, delay * 1000));
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

  return { play, stop, updateSettings, initializeAudio, isInitialized, settings, setSettings, effectiveWpm };
};
