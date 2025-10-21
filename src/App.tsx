import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMorsePlayer } from '../hooks/useMorsePlayer';
import { MorseSettings, Lesson, Score, HistoryEntry } from '../types';
import Controls from '../components/Controls';
import CharacterDisplay from '../components/CharacterDisplay';

const PREDEFINED_LESSONS: Lesson[] = [
  { id: 'ARZSJYEQTPIB', name: 'De bază', chars: 'ARZSJYEQTPIB' },
  { id: 'COLH', name: 'COLH', chars: 'COLH' },
  { id: 'ARZSJYEQTPIBCOLH', name: 'ARZSJYEQTPIBCOLH', chars: 'ARZSJYEQTPIBCOLH' },
  { id: 'DNFW', name: 'DNFW', chars: 'DNFW' },
  { id: 'ARZSJYEQTPIBCOLHDNFW', name: 'ARZSJYEQTPIBCOLHDNFW', chars: 'ARZSJYEQTPIBCOLHDNFW' },
  { id: 'full', name: 'Toate literele', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'},
  { id: 'cifre', name: 'Cifre', chars: '0123456789'}
];

const App: React.FC = () => {
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

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [transcriptionMode, setTranscriptionMode] = useState<boolean>(false);
  const [userTranscription, setUserTranscription] = useState<string>('');
  const [score, setScore] = useState<Score | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(PREDEFINED_LESSONS[0]);
  const [customLesson, setCustomLesson] = useState<string>('');
  const [startTime, setStartTime] = useState<string | null>(null);

  const displayedTextRef = useRef<string>('');
  const currentPlayTextRef = useRef<string>('');
  const preRunLenRef = useRef<number>(0);

  const { play, stop, updateSettings, initializeAudio, isInitialized, effectiveWpm } = useMorsePlayer(settings);

  // localStorage persistence (load)
  useEffect(() => {
    const saved = localStorage.getItem('morseTrainerState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.characterSet) setCharacterSet(parsed.characterSet);
        if (parsed.preRunText) setPreRunText(parsed.preRunText);
        setShowCharacter(parsed.showCharacter ?? true);
        setTranscriptionMode(parsed.transcriptionMode ?? false);
        setHistory(parsed.history || []);
        if (parsed.selectedLessonId) {
          const l = PREDEFINED_LESSONS.find(ll => ll.id === parsed.selectedLessonId);
          if (l) setSelectedLesson(l);
        } else if (parsed.characterSet) {
          const savedLesson = PREDEFINED_LESSONS.find(l => l.chars === parsed.characterSet);
          if (savedLesson) setSelectedLesson(savedLesson);
        }
      } catch (e) {
        console.error('Failed to load saved state', e);
      }
    }
  }, []);

  // localStorage persistence (save)
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
        selectedLessonId: selectedLesson ? selectedLesson.id : null,
      })
    );
  }, [settings, characterSet, preRunText, showCharacter, transcriptionMode, history, selectedLesson]);

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

  useEffect(() => { displayedTextRef.current = displayedText; }, [displayedText]);

  // -- omitted play logic for brevity, use your existing handlePlay --

  const buttonText = isPlaying ? 'Stop' : 'Start';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-teal-400">Morse Code Trainer</h1>
        </header>

        {/* Show effective WPM */}
        <div className="text-center text-teal-300 mt-2">
          <p>
            Character Speed: {settings.wpm} WPM | Effective Speed: {effectiveWpm.toFixed(1)} WPM
          </p>
        </div>

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
            onShowCharacterChange={(val) => { setShowCharacter(val); if (val) setTranscriptionMode(false); }}
            transcriptionMode={transcriptionMode}
            onTranscriptionModeChange={(val) => { setTranscriptionMode(val); if (val) setShowCharacter(false); }}
            onPlay={() => { /* your handlePlay */ }}
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
            onTranscriptionChange={setUserTranscription}
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
    
