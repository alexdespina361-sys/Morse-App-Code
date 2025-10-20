// Updated ./src/components/CharacterDisplay.tsx
import React, { useMemo } from 'react';
import { Score } from '../types';

interface CharacterDisplayProps {
  text: string;
  showCharacter: boolean;
  currentIndex: number | null;
  history: string[];
  transcriptionMode: boolean;
  userTranscription: string;
  onTranscriptionChange: (value: string) => void;
  score: Score | null;
  groupSize: number;
}

const CharacterDisplay: React.FC<CharacterDisplayProps> = ({
  text,
  showCharacter,
  currentIndex,
  history,
  transcriptionMode,
  userTranscription,
  onTranscriptionChange,
  score,
  groupSize,
}) => {
  // Format text with groups for display
  const formattedText = useMemo(() => {
    if (!text || text === 'SET CHARS') return text;
    return text.replace(/\n/g, '\n').split(' ').map(group => group.padEnd(groupSize, '_')).join(' ');
  }, [text, groupSize]);

  // For transcription: Auto-format input with spaces every groupSize
  const formattedUserInput = useMemo(() => {
    const input = userTranscription.replace(/ /g, '');
    let formatted = '';
    for (let i = 0; i < input.length; i += groupSize) {
      if (i > 0) formatted += ' ';
      formatted += input.slice(i, i + groupSize);
    }
    return formatted;
  }, [userTranscription, groupSize]);

  // Highlight for score
  const highlightedText = useMemo(() => {
    if (!score || !transcriptionMode || !text) return formattedText;
    const playedGroups = text.replace(/\n/g, ' ').split(' ').filter(g => g);
    const userGroups = userTranscription.toUpperCase().replace(/[^A-Z0-9]/g, '').match(new RegExp(`.{1,${groupSize}}`, 'g')) || [];
    let highlighted = '';
    playedGroups.forEach((group, gIdx) => {
      if (gIdx > 0) highlighted += ' ';
      const userGroup = userGroups[gIdx] || '';
      group.split('').forEach((char, cIdx) => {
        const isCorrect = cIdx < userGroup.length && char === userGroup[cIdx];
        const color = isCorrect ? 'text-green-400 border-green-500' : 'text-red-400 border-red-500';
        highlighted += `<span class="border px-0.5 ${color}">${char}</span>`;
      });
    });
    return highlighted;
  }, [score, transcriptionMode, text, userTranscription, groupSize, formattedText]);

  // Highlight current character if showCharacter and not transcription
  const displayedText = useMemo(() => {
    if (!showCharacter || currentIndex === null || transcriptionMode) return formattedText;
    const chars = formattedText.split('');
    chars[currentIndex] = `<span class="bg-teal-500 text-gray-900 px-1 rounded">${chars[currentIndex]}</span>`;
    return chars.join('');
  }, [formattedText, showCharacter, currentIndex, transcriptionMode]);

  if (!showCharacter && !transcriptionMode) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center h-32 flex items-center justify-center">
        <p className="text-gray-500 italic">Character display is hidden</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      {transcriptionMode ? (
        <>
          <textarea
            value={formattedUserInput}
            onChange={(e) => onTranscriptionChange(e.target.value)}
            className="w-full h-32 bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Type what you hear..."
            autoFocus
          />
          {score && (
            <div className="space-y-2">
              <p className="text-lg font-bold text-teal-400">
                Score: {score.percentage}% ({score.correct}/{score.total})
              </p>
              <div 
                dangerouslySetInnerHTML={{ __html: highlightedText }} 
                className="font-mono whitespace-pre-wrap text-gray-200"
              />
            </div>
          )}
        </>
      ) : (
        <div className="font-mono whitespace-pre-wrap text-gray-200 text-lg">
          <div dangerouslySetInnerHTML={{ __html: displayedText }} />
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-xl font-bold text-teal-400">History (Last {history.length})</h2>
          {history.map((entry, index) => (
            <pre key={index} className="bg-gray-700 p-2 rounded-md text-sm whitespace-pre-wrap">
              {entry}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
};

export default CharacterDisplay;
