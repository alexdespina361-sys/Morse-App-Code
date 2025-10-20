import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMorsePlayer } from '../hooks/useMorsePlayer';
import { MorseSettings, Lesson, Score, HistoryEntry } from '../types';
import Controls from '../components/Controls';
import CharacterDisplay from '../components/CharacterDisplay';

// Predefined lessons
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
  // Core states
  const [settings, setSettings] = useState<MorseSettings>({
    wpm: 18,
    charWpm: 15,    // added for Farnsworth
    effWpm: 5.4,    // added for Farnsworth
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

  const displayedTextRef = useRef<string>('');
  const currentPlayTextRef = useRef<string>('');
  const preRunLenRef = useRef<number>(0);

  const { play, stop, updateSettings, initializeAudio, isInitialized } = useMorsePlayer(settings);

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

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      stop();
      await new Promise(resolve => setTimeout(resolve, 200));
      const playedText = displayedTextRef.current || '';
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
      currentPlayTextRef.current = '';
      preRunLenRef.current = 0;
    } else {
      if (!isInitialized) initializeAudio();
      setGeneratedText('');
      setDisplayedText('');
      displayedTextRef.current = '';
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

      currentPlayTextRef.current = textToPlay;
      preRunLenRef.current = preRunLength;

      setIsPlaying(true);

      play(
        textToPlay,
        (index: number, isGroupEnd = false) => {
          const fullText = currentPlayTextRef.current;
          if (!fullText) return;

          if (index < preRunLenRef.current) {
            const charIndex = index - preRunLenRef.current;
            setCurrentCharIndex(charIndex >= 0 ? charIndex : null);
            return;
          }

          const charIndex = index - preRunLenRef.current;
          const char = fullText[index];

          setDisplayedText(prev => {
            let next = prev;
            if (char === ' ' || char === '\n') {
              next = next + char;
            } else {
              next = next + char;
            }
            if (isGroupEnd) {
              if (!next.endsWith(' ')) next = next + ' ';
            }
            displayedTextRef.current = next;
            return next;
          });

          setCurrentCharIndex(charIndex);
        },
        () => {
          const playedText = displayedTextRef.current || '';
          let computedScore = null;
          if (transcriptionMode && playedText && userTranscription) {
            computedScore = computeScore(playedText, userTranscription, settings.groupSize);
            setScore(computedScore);
          }
          addToHistory(playedText, computedScore);
          setIsPlaying(false);
          setCurrentCharIndex(null);
          setStartTime(null);
          currentPlayTextRef.current = '';
          preRunLenRef.current = 0;
        }
      );
    }
  }, [
    isPlaying,
    isInitialized,
    play,
    stop,
    initializeAudio,
    characterSet,
    settings,
    preRunText,
    transcriptionMode,
    userTranscription,
    computeScore,
    addToHistory
  ]);

  const handleTranscriptionChange = useCallback((value: string) => {
    const filtered = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setUserTranscription(filtered);
  }, []);

  const handleShowCharacterChange = useCallback((value: boolean) => {
    setShowCharacter(value);
    if (value) setTranscriptionMode(false);
  }, []);

  const handleTranscriptionModeChange = useCallback((value: boolean) => {
    setTranscriptionMode(value);
    if (value) setShowCharacter(false);
  }, []);

  const buttonText = isPlaying ? 'Stop' : 'Start';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-teal-400">Morse Code Trainer</h1>
        </header>

        <main className="space-y-8">

          {/* Farnsworth sliders */}
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Character Speed (WPM): {settings.charWpm}</label>
              <input
                type="range"
                min={5}
                max={40}
                step={0.1}
                value={settings.charWpm}
                onChange={e => handleSettingsChange('charWpm', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block mb-1">Effective Speed (WPM): {settings.effWpm}</label>
              <input
                type="range"
                min={1}
                max={20}
                step={0.1}
                value={settings.effWpm}
                onChange={e => handleSettingsChange('effWpm', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

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
    
