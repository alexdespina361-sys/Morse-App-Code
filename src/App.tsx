// Updated ./src/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useMorsePlayer } from '../hooks/useMorsePlayer';
import { MorseSettings, Lesson, Score, HistoryEntry } from '../types';
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
  const [displayedText, setDisplayedText] = useState<string>('');
  const [preRunText, setPreRunText] = useState<string>('VVVV');
  const [showCharacter, setShowCharacter] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentCharIndex, setCurrentCharIndex] = useState<number | null>(null);
  
  // New states for features
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [transcriptionMode, setTranscriptionMode] = useState<boolean>(false);
  const [userTranscription, setUserTranscription] = useState<string>('');
  const [score, setScore] = useState<Score | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(PREDEFINED_LESSONS[0]);
  const [customLesson, setCustomLesson] = useState<string>('');
  const [startTime, setStartTime] = useState<string | null>(null);

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
    const userInput = userText.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
    const scoreValue = total > 0 ? Math.round((correct / total) * 10) : 0;
    return { correct, total, score: scoreValue };
  }, []);

  const addToHistory = useCallback((playedText: string, computedScore: Score | null) => {
    if (startTime && playedText) {
      setHistory(prev => [...prev.slice(-49), { timestamp: startTime, playedText, score: computedScore }]);
    }
  }, [startTime]);

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      stop();
      await new Promise(resolve => setTimeout(resolve, 200));
      const playedLength = currentCharIndex !== null ? currentCharIndex + 1 : displayedText.length;
      const playedText = displayedText.slice(0, playedLength).replace(/\s+$/, '');
      setGeneratedText(playedText);
      setDisplayedText(playedText);
      let computedScore = null;
      if (transcriptionMode && playedText && userTranscription) {
        computedScore = computeScore(playedText, userTranscription, settings.groupSize);
        setScore(computedScore);
      }
      addToHistory(playedText, computedScore);
      setIsPlaying(false);
      setCurrentCharIndex(null);
      setStartTime(null);
    } else {
      if (!isInitialized) initializeAudio();
      setGeneratedText('');
      setDisplayedText('');
      setUserTranscription('');
      setScore(null);
      setCurrentCharIndex(null);
      setStartTime(new Date().toISOString());
      if (characterSet.length === 0) {
        setGeneratedText('SET CHARS');
        setDisplayedText('SET CHARS');
        return;
      }
      
      let text = '';
      let groupCount = 0;
      for (let i = 0; i < settings.totalChars; i++) {
        text += characterSet[Math.floor(Math.random() * characterSet.length)];
        if ((i + 1) % settings.groupSize === 0 && i + 1 < settings.totalChars) {
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
        (index, isGroupEnd = false) => {
          if (index >= preRunLength) {
            const charIndex = index - preRunLength;
            setCurrentCharIndex(charIndex);
            setDisplayedText(prev => {
              const currentChar = textToPlay[index];
              if (isGroupEnd && charIndex % settings.groupSize === 0 && charIndex > 0) {
                return prev + ' ';
              }
              return prev + currentChar;
            });
          }
        },
        () => {
          const playedText = displayedText;
          let computedScore = null;
          if (transcriptionMode && playedText && userTranscription) {
            computedScore = computeScore(playedText, userTranscription, settings.groupSize);
            setScore(computedScore);
          }
          addToHistory(playedText, computedScore);
          setIsPlaying(false);
          setCurrentCharIndex(null);
          setStartTime(null);
        }
      );
    }
  }, [isPlaying, isInitialized, play, stop, initializeAudio, characterSet, settings, preRunText, transcriptionMode, userTranscription, computeScore, addToHistory, currentCharIndex, displayedText]);

  const handleTranscriptionChange = useCallback((value: string) => {
    const filtered = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setUserTranscription(filtered);
  }, []);

  const handleShowCharacterChange = useCallback((value: boolean) => {
    setShowCharacter(value);
    if (value) {
      setTranscriptionMode(false);
    }
  }, []);

  const handleTranscriptionModeChange = useCallback((value: boolean) => {
    setTranscriptionMode(value);
    if (value) {
      setShowCharacter(false);
    }
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
            onShowCharacterChange={handleShowCharacterChange}
            transcriptionMode={transcriptionMode}
            onTranscriptionModeChange={handleTranscriptionModeChange}
            onPlay={handlePlay}
            isPlaying={isPlaying}
            buttonText={buttonText}
          />
          <CharacterDisplay 
            text={displayedText}
            showCharacter={showCharacter}
            currentIndex={currentCharIndex}
            history={history}
            transcriptionMode={transcriptionMode}
            userTranscription={userTranscription}
            onTranscriptionChange={handleTranscriptionChange}
            score={score}
            groupSize={settings.groupSize}
            characterSet={characterSet}
            isPlaying={isPlaying}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
