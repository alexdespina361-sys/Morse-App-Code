import { useState, useCallback, useRef, useEffect } from 'react';
import { MorseSettings } from '../types';
import { MORSE_CODE_MAP } from '../constants';

export const useMorsePlayer = (initialSettings: MorseSettings) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  // Removed oscillatorRef as we will be creating and forgetting oscillators.
  const settingsRef = useRef<MorseSettings>(initialSettings);
  const timeoutIdsRef = useRef<number[]>([]); // For UI updates, not for audio scheduling.

  useEffect(() => {
    settingsRef.current = initialSettings;
  }, [initialSettings]);

  const initializeAudio = useCallback(() => {
    // No user interaction yet, so we can't create the context.
    if (typeof window === 'undefined') return;

    // This function should be called from a user event (e.g., a button click).
    if (!audioContextRef.current) {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // If the context is created in a suspended state, it needs to be resumed.
      if (context.state === 'suspended') {
        context.resume();
      }

      const gainNode = context.createGain();
      gainNode.connect(context.destination);
      
      audioContextRef.current = context;
      gainNodeRef.current = gainNode;
      setIsInitialized(true);
    }
  }, []);

  const clearTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach(id => clearTimeout(id));
    timeoutIdsRef.current = [];
  }, []);

  // REFACTORED: playTone now accepts a startTime for precise scheduling.
  const playTone = useCallback((startTime: number, duration: number) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;

    const context = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    const oscillator = context.createOscillator();

    // --- IMPROVEMENT 1: Set Oscillator Type for Audio Quality ---
    // Explicitly set the type to 'sine' to avoid high-frequency warping (aliasing).
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(settingsRef.current.frequency, startTime);
    oscillator.connect(gainNode);

    // --- IMPROVEMENT 2: Use AudioContext clock for the volume envelope ---
    const attackTime = 0.005; // 5ms attack to prevent clicks
    const releaseTime = 0.005; // 5ms release
    const { volume } = settingsRef.current;
    
    // Schedule all volume changes using the precise startTime.
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    gainNode.gain.setValueAtTime(volume, startTime + duration - releaseTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }, []);

  const stop = useCallback(() => {
    clearTimeouts();
    if (gainNodeRef.current && audioContextRef.current) {
        const context = audioContextRef.current;
        const gainNode = gainNodeRef.current;
        const now = context.currentTime;
        
        // This is the most effective way to stop sound.
        // It cancels all future scheduled gain changes and ramps the volume to 0.
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.05); // Fade out over 50ms
    }
  }, [clearTimeouts]);

  // REFACTORED: The main play function now uses the Web Audio clock.
  const play = useCallback((
    text: string, 
    onCharChange: (index: number) => void,
    onEnd: () => void
  ) => {
    stop(); // Clear any previous playback.
    if (!audioContextRef.current) return;

    const context = audioContextRef.current;
    const dotDuration = 1.2 / settingsRef.current.wpm;
    const textUpperCase = text.toUpperCase();

    // --- IMPROVEMENT 3: High-Precision Scheduling Loop ---
    // Instead of setTimeout, we calculate future times based on the audio context's clock.
    let scheduleTime = context.currentTime + 0.1; // Start 100ms in the future for safety.

    for (let i = 0; i < textUpperCase.length; i++) {
      const char = textUpperCase[i];
      const morseChar = MORSE_CODE_MAP[char];
      
      // UI updates can still use setTimeout, as they don't need to be sample-accurate.
      const uiUpdateTime = (scheduleTime - context.currentTime) * 1000;
      const charTimeoutId = window.setTimeout(() => onCharChange(i), uiUpdateTime);
      timeoutIdsRef.current.push(charTimeoutId);

      if (char === ' ') {
        scheduleTime += settingsRef.current.wordSpaceDots * dotDuration;
        continue;
      }

      if (morseChar) {
        for (let j = 0; j < morseChar.length; j++) {
          const signal = morseChar[j];
          const duration = signal === '.' ? dotDuration : 3 * dotDuration;
          
          // Schedule the tone using the precise clock.
          playTone(scheduleTime, duration);

          scheduleTime += duration;
          if (j < morseChar.length - 1) {
            scheduleTime += dotDuration; // Intra-character space (1 dot).
          }
        }
        // Inter-character space (3 dots).
        scheduleTime += settingsRef.current.charSpaceDots * dotDuration;
      }
    }

    // Schedule the final onEnd callback.
    const endTimeoutId = window.setTimeout(onEnd, (scheduleTime - context.currentTime) * 1000);
    timeoutIdsRef.current.push(endTimeoutId);
  }, [playTone, stop]);

  const updateSettings = useCallback((newSettings: Partial<MorseSettings>) => {
    settingsRef.current = { ...settingsRef.current, ...newSettings };
  }, []);

  return { play, stop, updateSettings, initializeAudio, isInitialized };
};
