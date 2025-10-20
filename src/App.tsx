// Updated ./src/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useMorsePlayer } from '../hooks/useMorsePlayer';
import { MorseSettings, Lesson, Score } from '../types';
import Controls from '../components/Controls';
import CharacterDisplay from '../components/CharacterDisplay';

// Predefined lessons
const PREDEFINED_LESSONS: Lesson[] = [
  { id: 'beginner', name: 'Beginner (ETAIN)', chars: 'ETAIN' },
  { id: 'et', name: 'E & T', chars: 'ET' },
  { id: 'numbers', name: 'Numbers (0-9)', chars: '0123456789' },
  { id: 'intermediate', name: 'Intermediate (ETAINMSURW)', chars: 'ETAINMSURW' },
  { id: 'full-letters', name: 'Full Letters', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { id: 'full', name: 'Full (Letters + Numbers)', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' },
];

const App: React.FC = () => {
  // Core states
  const [settings, setSettings] = useState<MorseSettings>({
    wpm: 18,
    frequency: 750,
    volume: 0.7,
    charSpaceDots: 7,
    wordSpaceDots: 5,
    groupSize: 4,
    totalChars: 120,
  });
  const [characterSet, setCharacterSet] = useState<string>(PREDEFINED_LESSONS[0].chars);
  const [generatedText, setGeneratedText] = useState<string>('');
  const [preRunText, setPreRunText] = useState<string>('VVVV');
  const [showCharacter, setShowCharacter] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentCharIndex, setCurrentCharIndex] = useState<number | null>(null);
  
  // New states for features
  const [history, setHistory] = useState<string[]>([]);
  const [transcriptionMode, setTranscriptionMode] = useState<boolean>(false);
  const [userTranscription, setUserTranscription] = useState<string>('');
  const [score, setScore] = useState<Score | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(PREDEFINED_LESSONS[0]);
  const [customLesson, setCustomLesson] = useState<string>('');

  const { play, stop, updateSettings, initializeAudio, isInitialized } = useMorsePlayer(settings);

  // localStorage persistence
  useEffect(() => {
    const saved = localStorage.getItem('morseTrainerState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed.settings || settings);
        setCharacterSet(parsed.characterSet || characterSet);
        setPreRunText(parsed.preRunText || preRunText);
        setShowCharacter(parsed.showCharacter ?? true);
        setTranscriptionMode(parsed.transcriptionMode ?? false);
        setHistory(parsed.history || []);
        // Restore lesson if possible
        const savedLesson = PREDEFINED_LESSONS.find(l => l.chars === parsed.characterSet);
        if (savedLesson) setSelectedLesson(savedLesson);
      } catch (e) {
        console.error('Failed to load saved state');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'morseTrainerState',
      JSON.stringify({
        settings,
        characterSet,
        preRunText,
        showCharacter,
        transcriptionMode,
        history,
      })
    );
  }, [settings, characterSet, preRunText, showCharacter, transcriptionMode, history]);

  // Lesson handling
  const handleLessonChange = useCallback((lessonId: string) => {
    if (lessonId === '') {
      setSelectedLesson(null);
      return;
    }
    const lesson = PREDEFINED_LESSONS.find(l => l.id === lessonId);
    if (!lesson) return;
    setSelectedLesson(lesson);
    setCharacterSet(lesson.chars);
    setCustomLesson('');
  }, []);

  const handleCustomLessonChange = useCallback((value: string) => {
    setCustomLesson(value);
    if (value.trim()) {
      setCharacterSet(value.toUpperCase());
      setSelectedLesson(null);
    }
  }, []);

  const handleSettingsChange = useCallback(<K extends keyof MorseSettings>(key: K, value: MorseSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettings({ [key]: value } as any);
  }, [settings, updateSettings]);

  // Compute score from groups
  const computeScore = useCallback((playedText: string, userText: string, groupSize: number): Score => {
    const playedGroups = playedText.replace(/\n/g, ' ').split(' ').filter(g => g.length > 0);
    const userInput = userText.toUpperCase().replace(/[^A-Z]/g, '');
    const userGroups: string[] = [];
    for (let i = 0; i < userInput.length; i += groupSize) {
      userGroups.push(userInput.slice(i, i + groupSize));
    }
    let correct = 0;
    let total = 0;
    playedGroups.forEach((group, idx) => {
      const userGroup = userGroups[idx] || '';
      total += group.length;
      for (let j = 0; j < group.length; j++) {
        if (j < userGroup.length && group[j] === userGroup[j]) {
          correct++;
        }
      }
    });
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, total, percentage };
  }, []);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      // Stop
      stop();
      if (generatedText) {
        setHistory(prev => [...prev.slice(-19), generatedText]); // Keep last 20 max
      }
      if (transcriptionMode && generatedText && userTranscription) {
        setScore(computeScore(generatedText, userTranscription, settings.groupSize));
      }
      setIsPlaying(false);
      setCurrentCharIndex(null);
      // Keep generatedText and userTranscription
    } else {
      // Start new
      setGeneratedText('');
      setUserTranscription('');
      setScore(null);
      setCurrentCharIndex(null);
      if (!isInitialized) {
        initializeAudio();
        return;
      }
      if (characterSet.length === 0) {
        setGeneratedText('SET CHARS');
        return;
      }
      
      let text = '';
      let groupCount = 0;
      for (let i = 0; i < settings.totalChars; i++) {
        text += characterSet[Math.floor(Math.random() * characterSet.length)];
        if ((i + 1) % settings.groupSize === 0 && (i + 1) < settings.totalChars) {
          groupCount++;
          text += groupCount % 10 === 0 ? '\n' : ' ';
        }
      }
      setGeneratedText(text);
      
      const upperCasePreRun = preRunText.toUpperCase().trim();
      const textToPlay = upperCasePreRun ? `${upperCasePreRun} ${text}` : text;
      const preRunLength = upperCasePreRun ? upperCasePreRun.length + 1 : 0;

      setIsPlaying(true);
      play(
        textToPlay,
        (index) => {
          if (index >= preRunLength) {
            setCurrentCharIndex(index - preRunLength);
          } else {
            setCurrentCharIndex(null);
          }
        },
        () => {
          // Finish
          if (generatedText) {
            setHistory(prev => [...prev.slice(-19), generatedText]);
          }
          if (transcriptionMode && generatedText && userTranscription) {
            setScore(computeScore(generatedText, userTranscription, settings.groupSize));
          }
          setIsPlaying(false);
          setCurrentCharIndex(null);
        }
      );
    }
  }, [isPlaying, isInitialized, play, stop, initializeAudio, characterSet, settings, preRunText, generatedText, transcriptionMode, userTranscription, computeScore]);

  const handleTranscriptionChange = useCallback((value: string) => {
    // Enforce uppercase letters only, later spacing in display
    const filtered = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setUserTranscription(filtered);
  }, []);

  const buttonText = isPlaying ? 'Stop' : 'Start';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-teal-400">Morse Code Trainer</h1>
        </header>

        <main className="space-y-8">
          <Controls
            settings={settings}
            onSettingsChange={handleSettingsChange}
            selectedLesson={selectedLesson}
            onLessonChange={handleLessonChange}
            customLesson={customLesson}
            onCustomLessonChange={handleCustomLessonChange}
            characterSet={characterSet}
            onCharacterSetChange={setCharacterSet}
            preRunText={preRunText}
            onPreRunTextChange={setPreRunText}
            showCharacter={showCharacter}
            onShowCharacterChange={setShowCharacter}
            transcriptionMode={transcriptionMode}
            onTranscriptionModeChange={setTranscriptionMode}
            onPlay={handlePlay}
            isPlaying={isPlaying}
            isReady={isInitialized}
            buttonText={buttonText}
          />
          <CharacterDisplay 
            text={generatedText}
            showCharacter={showCharacter}
            currentIndex={currentCharIndex}
            history={history}
            transcriptionMode={transcriptionMode}
            userTranscription={userTranscription}
            onTranscriptionChange={handleTranscriptionChange}
            score={score}
            groupSize={settings.groupSize}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
