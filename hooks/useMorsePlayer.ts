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
  const [settings, setSettings] = useState(initialSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    return () => {
      // close audio context on unmount only
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

  /**
   * play(text, onProgress, onFinish)
   * onProgress(indexInText, isGroupEnd = false)
   * - indexInText is the index into the passed `text` string (includes preRun, spaces, newlines)
   * - isGroupEnd indicates a group boundary (useful for UI to insert group spaces)
   */
  const play = (text: string, onProgress: (i: number, isGroupEnd?: boolean) => void, onFinish: () => void) => {
    initializeAudio();
    stop();

    const dit = 1200 / settings.wpm; // ms per dit
    const charSpace = dit * settings.charSpaceDots;
    const wordSpace = dit * settings.wordSpaceDots;
    const groupSize = settings.groupSize || 4;

    let delay = 0;
    let groupCount = 0;
    let visibleCharCount = 0; // counts only non-space/newline chars (for group tracking)

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === ' ' || char === '\n') {
        // word/line break: schedule onProgress for the space itself (so UI can reflect it if needed)
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay));
        delay += wordSpace;
        // reset group counter after a word break
        groupCount = 0;
        continue;
      }

      const code = MORSE_CODE[char.toUpperCase()];
      if (!code) {
        // unknown char - still notify progress so UI doesn't hang
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay));
        continue;
      }

      // Play each symbol in the character
      for (const symbol of code) {
        const durMs = symbol === '.' ? dit : dit * 3;
        timeoutsRef.current.push(setTimeout(() => playTone(durMs / 1000), delay));
        delay += durMs + dit; // symbol + intra-char gap
      }

      // After character finished, determine if a group boundary should be added
      groupCount++;
      visibleCharCount++;

      // If group completed and next char is not a space/newline and not end-of-text, insert group gap
      const nextIsChar = i + 1 < text.length && text[i + 1] !== ' ' && text[i + 1] !== '\n';
      if (groupCount === groupSize && nextIsChar) {
        delay += dit; // small extra gap between groups
        // schedule onProgress indicating group end (isGroupEnd = true)
        timeoutsRef.current.push(setTimeout(() => onProgress(i, true), delay));
        groupCount = 0;
      } else {
        // normal inter-character spacing
        delay += charSpace - dit;
        // schedule normal progress
        timeoutsRef.current.push(setTimeout(() => onProgress(i), delay));
      }
    }

    // schedule finish
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
