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

export interface MorseSettings {
  wpm: number;           // character speed
  frequency: number;
  volume: number;
  charSpaceDots: number;
  wordSpaceDots: number;
  groupSize: number;
  totalChars: number;
}

export const useMorsePlayer = (initialSettings: Partial<MorseSettings>) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [settings, setSettings] = useState<MorseSettings>({
    wpm: 18,
    frequency: 750,
    volume: 0.7,
    charSpaceDots: 3,
    wordSpaceDots: 7,
    groupSize: 4,
    totalChars: 120,
    ...initialSettings
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [effectiveWpm, setEffectiveWpm] = useState<number>(settings.wpm);

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
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();

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

  const updateSettings = (newSettings: Partial<MorseSettings>) => {
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

  const play = (
    text: string,
    onProgress: (i: number, isGroupEnd?: boolean) => void,
    onFinish: () => void
  ) => {
    initializeAudio();
    stop();

    const ditDurationMs = 1200 / settings.wpm; // standard dit duration for character speed
    const charSpace = ditDurationMs * settings.charSpaceDots;
    const wordSpace = ditDurationMs * settings.wordSpaceDots;

    let delay = 0;
    let groupCount = 0;
    let totalSignalTime = 0; // sum of all signal (dit/dah) and spacing durations
    let totalChars = 0;      // total letters played (excluding spaces)

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === ' ' || char === '\n') {
        delay += wordSpace;
        totalSignalTime += wordSpace;
        groupCount = 0;
        continue;
      }

      const code = MORSE_CODE[char.toUpperCase()];
      if (!code) continue;

      totalChars++;
      for (const symbol of code) {
        const durMs = symbol === '.' ? ditDurationMs : ditDurationMs * 3;
        timeoutsRef.current.push(setTimeout(() => playTone(durMs / 1000), delay));
        delay += durMs + ditDurationMs; // intra-character spacing at standard character dit
        totalSignalTime += durMs + ditDurationMs;
      }

      groupCount++;
      const nextIsChar = i + 1 < text.length && text[i + 1] !== ' ' && text[i + 1] !== '\n';
      if (groupCount === settings.groupSize && nextIsChar) {
        delay += ditDurationMs; // extra group gap
        totalSignalTime += ditDurationMs;
        groupCount = 0;
      } else {
        delay += charSpace - ditDurationMs; // inter-character spacing
        totalSignalTime += charSpace - ditDurationMs;
      }
    }

    // ARRL Effective WPM calculation based on PARIS standard (50 units per word)
    // Effective WPM = (50 units / average ms per unit) * 60 sec / 1000ms
    const avgUnitMs = totalSignalTime / (totalChars * 50); // approximate units per character
    const arrlEffWpm = Math.round(1200 / avgUnitMs / 50 * 1e2) / 1e2; // rounded 2 decimals
    setEffectiveWpm(arrlEffWpm);

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

  return { play, stop, updateSettings, initializeAudio, isInitialized, settings, setSettings, effectiveWpm };
};
