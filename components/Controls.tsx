import React from 'react';
import { MorseSettings } from '../types';
import Slider from './Slider';
import { PlayIcon, StopIcon } from './Icons';

interface ControlsProps {
  settings: MorseSettings;
  onSettingsChange: <K extends keyof MorseSettings,>(key: K, value: MorseSettings[K]) => void;
  characterSet: string;
  onCharacterSetChange: (value: string) => void;
  preRunText: string;
  onPreRunTextChange: (value: string) => void;
  showCharacter: boolean;
  onShowCharacterChange: (value: boolean) => void;
  onPlay: () => void;
  isPlaying: boolean;
  isReady: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  settings,
  onSettingsChange,
  characterSet,
  onCharacterSetChange,
  preRunText,
  onPreRunTextChange,
  showCharacter,
  onShowCharacterChange,
  onPlay,
  isPlaying,
  isReady,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Slider
          label="Speed (WPM)"
          min={5}
          max={40}
          step={1}
          value={settings.wpm}
          onChange={(e) => onSettingsChange('wpm', parseInt(e.target.value, 10))}
          unit="wpm"
        />
        <Slider
          label="Frequency"
          min={300}
          max={1200}
          step={10}
          value={settings.frequency}
          onChange={(e) => onSettingsChange('frequency', parseInt(e.target.value, 10))}
          unit="Hz"
        />
        <Slider
            label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => onSettingsChange('volume', parseFloat(e.target.value))}
        />
        <Slider
          label="Character Spacing"
          min={1}
          max={10}
          step={1}
          value={settings.charSpaceDots}
          onChange={(e) => onSettingsChange('charSpaceDots', parseInt(e.target.value, 10))}
          unit="dots"
        />
        <Slider
          label="Word Spacing"
          min={3}
          max={15}
          step={1}
          value={settings.wordSpaceDots}
          onChange={(e) => onSettingsChange('wordSpaceDots', parseInt(e.target.value, 10))}
          unit="dots"
        />
        <Slider
          label="Group Size"
          min={2}
          max={10}
          step={1}
          value={settings.groupSize}
          onChange={(e) => onSettingsChange('groupSize', parseInt(e.target.value, 10))}
          unit="chars"
        />
        <div className="md:col-span-3">
            <Slider
              label="Number of Characters"
              min={20}
              max={200}
              step={5}
              value={settings.totalChars}
              onChange={(e) => onSettingsChange('totalChars', parseInt(e.target.value, 10))}
              unit="chars"
            />
        </div>
      </div>
      
      <div>
        <label htmlFor="characterSet" className="block text-sm font-medium text-gray-300 mb-2">
          Character Set (add characters to be randomly chosen)
        </label>
        <input
          type="text"
          id="characterSet"
          value={characterSet}
          onChange={(e) => onCharacterSetChange(e.target.value.toUpperCase())}
          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          placeholder="e.g., ABCDE12345"
        />
      </div>

      <div>
        <label htmlFor="preRunText" className="block text-sm font-medium text-gray-300 mb-2">
          Pre-start Text (played but not shown)
        </label>
        <input
          type="text"
          id="preRunText"
          value={preRunText}
          onChange={(e) => onPreRunTextChange(e.target.value.toUpperCase())}
          className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          placeholder="e.g., VVVV"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
            <input
              id="show-character-checkbox"
              type="checkbox"
              checked={showCharacter}
              onChange={(e) => onShowCharacterChange(e.target.checked)}
              className="w-4 h-4 text-teal-500 bg-gray-700 border-gray-600 rounded focus:ring-teal-600"
            />
            <label htmlFor="show-character-checkbox" className="ml-2 text-sm font-medium text-gray-300">
              Show current character
            </label>
        </div>
        
        <button
          onClick={onPlay}
          className={`px-6 py-2 flex items-center gap-2 font-bold rounded-md transition-all duration-200 text-lg ${
            isPlaying 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-teal-500 hover:bg-teal-600 text-gray-900'
          }`}
        >
          {isPlaying ? <StopIcon /> : <PlayIcon />}
          <span>{isPlaying ? 'Stop' : isReady ? 'Start' : 'Init Audio'}</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;