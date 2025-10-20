// Updated ./src/components/Controls.tsx
import React from 'react';
import { MorseSettings, Lesson } from '../types';
import Slider from './Slider';
import { PlayIcon, StopIcon } from './Icons';

interface ControlsProps {
  settings: MorseSettings;
  onSettingsChange: <K extends keyof MorseSettings>(key: K, value: MorseSettings[K]) => void;
  selectedLesson: Lesson | null;
  onLessonChange: (id: string) => void;
  customLesson: string;
  onCustomLessonChange: (value: string) => void;
  characterSet: string;
  onCharacterSetChange: (value: string) => void;
  preRunText: string;
  onPreRunTextChange: (value: string) => void;
  showCharacter: boolean;
  onShowCharacterChange: (value: boolean) => void;
  transcriptionMode: boolean;
  onTranscriptionModeChange: (value: boolean) => void;
  onPlay: () => void;
  isPlaying: boolean;
  buttonText: string;
}

const PREDEFINED_LESSONS: Lesson[] = [
  { id: 'ARZSJYEQTPIB', name: 'De bază', chars: 'ARZSJYEQTPIB' },
  { id: 'COLH', name: 'COLH', chars: 'COLH' },
  { id: 'ARZSJYEQTPIBCOLH', name: 'ARZSJYEQTPIBCOLH', chars: 'ARZSJYEQTPIBCOLH' },
  { id: 'DNFW', name: 'DNFW', chars: 'DNFW' },
  { id: 'ARZSJYEQTPIBCOLHDNFW', name: 'ARZSJYEQTPIBCOLHDNFW', chars: 'ARZSJYEQTPIBCOLHDNFW' },
  { id: 'full', name: 'Toate literele', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'},
  { id: 'cifre', name: 'Cifre', chars: '0123456789'}]


const Controls: React.FC<ControlsProps> = ({
  settings,
  onSettingsChange,
  selectedLesson,
  onLessonChange,
  customLesson,
  onCustomLessonChange,
  characterSet,
  onCharacterSetChange,
  preRunText,
  onPreRunTextChange,
  showCharacter,
  onShowCharacterChange,
  transcriptionMode,
  onTranscriptionModeChange,
  onPlay,
  isPlaying,
  buttonText,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
      {/* Sliders grid */}
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
      
      {/* Lessons */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Lesson
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedLesson?.id || ''}
            onChange={(e) => onLessonChange(e.target.value)}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Custom Lesson</option>
            {PREDEFINED_LESSONS.map(lesson => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Custom chars (e.g., ABCDE)"
            value={customLesson}
            onChange={(e) => onCustomLessonChange(e.target.value)}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
          />
        </div>
        {selectedLesson && (
          <p className="text-xs text-gray-500 mt-1">Using: {selectedLesson.chars}</p>
        )}
      </div>

      {/* Character Set (kept for manual override) */}
      <div>
        <label htmlFor="characterSet" className="block text-sm font-medium text-gray-300 mb-2">
          Character Set (manual override)
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

      {/* Checkboxes */}
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
        <div className="flex items-center">
          <input
            id="transcription-checkbox"
            type="checkbox"
            checked={transcriptionMode}
            onChange={(e) => onTranscriptionModeChange(e.target.checked)}
            className="w-4 h-4 text-teal-500 bg-gray-700 border-gray-600 rounded focus:ring-teal-600"
          />
          <label htmlFor="transcription-checkbox" className="ml-2 text-sm font-medium text-gray-300">
            Transcription Mode
          </label>
        </div>
      </div>
      
      {/* Play Button */}
      <div className="flex justify-center">
        <button
          onClick={onPlay}
          className={`px-6 py-2 flex items-center gap-2 font-bold rounded-md transition-all duration-200 text-lg ${
            isPlaying 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-teal-500 hover:bg-teal-600 text-gray-900'
          }`}
        >
          {isPlaying ? <StopIcon /> : <PlayIcon />}
          <span>{buttonText}</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;
