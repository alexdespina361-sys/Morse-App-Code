import { useEffect, useRef, useState } from 'react';

const MORSE_CODE: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '?': '..--..',
  '!': '-.-.--',
};

export const useMorsePlayer = (initialSettings: any) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timeoutsRef = useRef<any[]>([]);
  const [settings, setSettings] = useState({
    wpm: initialSettings.wpm || 18,
    frequency: initialSettings.frequency || 750,
    volume: initialSettings.volume || 0.6,
    charSpaceDots: initialSettings.charSpaceDots || 3,
    wordSpaceDots: initialSettings.wordSpaceDots || 7,
    groupSize: initialSettings.groupSize || 4,
    totalChars: initialSettings.totalChars || 120,
    ...initialSettings
  });

  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const initializeAudio = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
      audioContextRef.current.resume(); // Ensure context is running after user gesture
      oscillatorRef.current = audioContextRef.current.createOscillator();
      oscillatorRef.current.type = 'sine'; // Clean tone
      oscillatorRef.current.frequency.value = settings.frequency;
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0;
      oscillatorRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
      oscillatorRef.current.start();
    }
  };

  // Update frequency if changed after initialization
  useEffect(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.frequency.value = settings.frequency;
    }
  }, [settings.frequency]);

  const scheduleTone = (startTime: number, duration: number) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;
    const rampTime = 0.005; // 5ms for smooth anti-click ramps
    gainNodeRef.current.gain.setValueAtTime(0, startTime);
    gainNodeRef.current.gain.linearRampToValueAtTime(settings.volume, startTime + rampTime);
    gainNodeRef.current.gain.setValueAtTime(settings.volume, startTime + duration - rampTime);
    gainNodeRef.current.gain.linearRampToValueAtTime(0, startTime + duration);
  };

  const play = (text: string, onProgress: any, onFinish: any) => {
    initializeAudio();
    stop();

    const dotDurationMs = 1200 / settings.wpm; // in ms
    const now = audioContextRef.current!.currentTime + 0.1; // Buffer for scheduling
    let audioTime = now; // in seconds
    let groupCount = 0;

    text = text.toUpperCase();

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = MORSE_CODE[char];

      if (!code) continue; // Skip spaces, newlines, etc.

      const charStartDelayMs = (audioTime - now) * 1000;
      const isGroupEnd = groupCount + 1 === settings.groupSize;
      timeoutsRef.current.push(setTimeout(() => onProgress(i, isGroupEnd), charStartDelayMs));

      for (const symbol of code) {
        const toneDurationMs = symbol === '.' ? dotDurationMs : dotDurationMs * 3;
        const toneDuration = toneDurationMs / 1000;
        scheduleTone(audioTime, toneDuration);
        audioTime += toneDuration + (dotDurationMs / 1000);
      }

      audioTime += (dotDurationMs / 1000) * (settings.charSpaceDots - 1);

      groupCount++;
      if (groupCount === settings.groupSize) {
        audioTime += (dotDurationMs / 1000) * settings.wordSpaceDots;
        groupCount = 0;
      }
    }

    const finalDelayMs = (audioTime - now) * 1000;
    timeoutsRef.current.push(setTimeout(onFinish, finalDelayMs));
  };

  const stop = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(0, audioContextRef.current.currentTime, 0.01);
    }
  };

  const updateSettings = (newSettings: any) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return {
    play,
    stop,
    updateSettings,
    initializeAudio,
    isInitialized: !!audioContextRef.current,
  };
};
