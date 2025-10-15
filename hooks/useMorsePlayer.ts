import { useState, useCallback, useRef, useEffect } from 'react';
import { MorseSettings } from '../types';
import { MORSE_CODE_MAP } from '../constants';

export const useMorsePlayer = (initialSettings: MorseSettings) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const settingsRef = useRef<MorseSettings>(initialSettings);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    settingsRef.current = initialSettings;
  }, [initialSettings]);

  const initializeAudio = useCallback(() => {
    if (!isInitialized) {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gainNode = context.createGain();
      gainNode.connect(context.destination);

      // Resume context if it's suspended by the browser's autoplay policy.
      if (context.state === 'suspended') {
        context.resume();
      }
      
      audioContextRef.current = context;
      gainNodeRef.current = gainNode;
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const clearTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach(id => clearTimeout(id));
    timeoutIdsRef.current = [];
  }, []);

  const playTone = useCallback((duration: number) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;

    const context = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    const oscillator = context.createOscillator();
    oscillatorRef.current = oscillator;

    oscillator.frequency.setValueAtTime(settingsRef.current.frequency, context.currentTime);
    oscillator.connect(gainNode);

    const now = context.currentTime;
    const attackTime = 0.005; 
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(settingsRef.current.volume, now + attackTime);
    gainNode.gain.setValueAtTime(settingsRef.current.volume, now + duration - attackTime);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }, []);

  const stop = useCallback(() => {
    clearTimeouts();
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // may already be stopped
      }
    }
    if (gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime);
        gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    }
  }, [clearTimeouts]);

  const play = useCallback((
    text: string, 
    onCharChange: (index: number) => void,
    onEnd: () => void
  ) => {
    stop();
    if (!audioContextRef.current) return;

    const dotDuration = 1.2 / settingsRef.current.wpm;
    let scheduleTime = audioContextRef.current.currentTime;
    const textUpperCase = text.toUpperCase();

    for (let i = 0; i < textUpperCase.length; i++) {
      const char = textUpperCase[i];
      const morseChar = MORSE_CODE_MAP[char];
      
      const charTimeoutId = window.setTimeout(() => onCharChange(i), (scheduleTime - audioContextRef.current!.currentTime) * 1000);
      timeoutIdsRef.current.push(charTimeoutId);

      if (char === ' ') {
        scheduleTime += settingsRef.current.wordSpaceDots * dotDuration;
        continue;
      }

      if (morseChar) {
        for (let j = 0; j < morseChar.length; j++) {
          const signal = morseChar[j];
          const duration = signal === '.' ? dotDuration : 3 * dotDuration;
          
          const timeoutId = window.setTimeout(() => playTone(duration), (scheduleTime - audioContextRef.current!.currentTime) * 1000);
          timeoutIdsRef.current.push(timeoutId);

          scheduleTime += duration;
          if (j < morseChar.length - 1) {
            scheduleTime += dotDuration; // Intra-character space
          }
        }
        scheduleTime += settingsRef.current.charSpaceDots * dotDuration; // Inter-character space
      }
    }

    const endTimeoutId = window.setTimeout(onEnd, (scheduleTime - audioContextRef.current!.currentTime) * 1000);
    timeoutIdsRef.current.push(endTimeoutId);
  }, [playTone, stop]);

  const updateSettings = useCallback((newSettings: Partial<MorseSettings>) => {
    settingsRef.current = { ...settingsRef.current, ...newSettings };
  }, []);

  return { play, stop, updateSettings, initializeAudio, isInitialized };
};