import React, { useState, useCallback } from 'react';
import { useMorsePlayer } from './hooks/useMorsePlayer';
import { MorseSettings } from './types';
import Controls from './components/Controls';
import CharacterDisplay from './components/CharacterDisplay';

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
  const [characterSet, setCharacterSet] = useState<string>('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  const [generatedText, setGeneratedText] = useState<string>('');
  const [preRunText, setPreRunText] = useState<string>('VVVV');
  const [showCharacter, setShowCharacter] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentCharIndex, setCurrentCharIndex] = useState<number | null>(null);
  
  const { play, stop, updateSettings, initializeAudio, isInitialized } = useMorsePlayer(settings);

  const handleSettingsChange = useCallback(<K extends keyof MorseSettings,>(key: K, value: MorseSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettings({ [key]: value });
  }, [settings, updateSettings]);

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
      setCurrentCharIndex(null);
    } else {
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
        if ((i + 1) % settings.groupSize === 0) { // A group is complete
            if ((i + 1) < settings.totalChars) { // Don't add separator at the very end
                groupCount++;
                if (groupCount % 10 === 0) {
                    text += '\n'; // Add newline every 10 groups
                } else {
                    text += ' '; // Add space for other groups
                }
            }
        }
      }
      
      const newText = text;
      setGeneratedText(newText);
      setCurrentCharIndex(null);
      
      const upperCasePreRun = preRunText.toUpperCase();
      const textToPlay = upperCasePreRun ? `${upperCasePreRun} ${newText}` : newText;
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
          setIsPlaying(false);
          setCurrentCharIndex(null);
        }
      );
    }
  }, [isPlaying, isInitialized, play, stop, initializeAudio, characterSet, settings, preRunText]);
  
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
                characterSet={characterSet}
                onCharacterSetChange={setCharacterSet}
                preRunText={preRunText}
                onPreRunTextChange={setPreRunText}
                showCharacter={showCharacter}
                onShowCharacterChange={setShowCharacter}
                onPlay={handlePlay}
                isPlaying={isPlaying}
                isReady={isInitialized}
            />
            <CharacterDisplay 
                text={generatedText}
                showCharacter={showCharacter}
                currentIndex={currentCharIndex}
            />
        </main>
      </div>
    </div>
  );
};

export default App;