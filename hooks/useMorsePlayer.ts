// ./src/hooks/useMorsePlayer.ts
import { useEffect, useRef, useState } from 'react';

const MORSE_CODE: Record<string, string> = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  ' ': ' '
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
      oscillatorRef.current = audioContextRef.current.createOscillator();
      gainNodeRef.current = audioContextRef.current.createGain();

      gainNodeRef.current.gain.value = 0;
      oscillatorRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
      oscillatorRef.current.start();
    }
  };

  const playTone = (duration: number) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;
    const now = audioContextRef.current.currentTime;
    gainNodeRef.current!.gain.setValueAtTime(settings.volume, now);
    gainNodeRef.current!.gain.setValueAtTime(0, now + duration);
  };

  const play = (text: string, onProgress: any, onFinish: any) => {
    initializeAudio();
    stop();

    const dotDuration = 1200 / settings.wpm;
    let delay = 0;
    let groupCount = 0;

    text = text.toUpperCase();

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = MORSE_CODE[char];

      if (!code) continue;

      for (const symbol of code) {
        const toneTime = symbol === '.' ? dotDuration : dotDuration * 3;
        timeoutsRef.current.push(setTimeout(() => playTone(toneTime / 1000), delay));
        delay += toneTime + dotDuration;
      }

      delay += dotDuration * (settings.charSpaceDots - 1);
      onProgress(i);

      groupCount++;
      if (groupCount === settings.groupSize) {
        delay += dotDuration * settings.wordSpaceDots;
        groupCount = 0;
      }
    }

    timeoutsRef.current.push(setTimeout(onFinish, delay));
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
    settings,
    setSettings
  };
};
