// ./components/CharacterDisplay.tsx
import React, { useMemo, useState } from 'react';
import { Score, HistoryEntry } from '../types';

interface CharacterDisplayProps {
  text: string;
  showCharacter: boolean;
  currentIndex: number | null;
  history: HistoryEntry[];
  transcriptionMode: boolean;
  userTranscription: string;
  onTranscriptionChange: (value: string) => void;
  score: Score | null;
  groupSize: number;
  characterSet: string;
  isPlaying: boolean;
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
  characterSet,
  isPlaying,
}) => {
  const [historyExpanded, setHistoryExpanded] = useState(false);  // Start minimized

  // Format text with groups for display
  const formattedText = useMemo(() => {
    if (!text || text === 'SET CHARS') return text;
    const trimmedText = text.trimEnd();
    const groups = trimmedText.split(' ');
    const formattedGroups = groups.map((group, idx) => {
      if (idx === groups.length - 1 && group.length < groupSize) {
        return group;
      }
      return group.padEnd(groupSize, '_');
    });
    return formattedGroups.join(' ').replace(/\n/g, '\n');
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
    const playedGroups = text.replace(/\n/g, ' ').split(' ').filter(g => g.length > 0);
    const userGroups = userTranscription.toUpperCase().replace(/[^A-Z0-9?!]/g, '').match(new RegExp(`.{1,${groupSize}}`, 'g')) || [];
    let highlighted = '';
    playedGroups.forEach((group, gIdx) => {
      if (gIdx > 0) highlighted += ' ';
      const userGroup = userGroups[gIdx] || '';
      group.split('').forEach((char, cIdx) => {
        const isCorrect = cIdx < userGroup.length && char === userGroup[cIdx];
        const color = isCorrect ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
        highlighted += `<span class="${color}">${char}</span>`;
      });
    });
    return highlighted;
  }, [score, transcriptionMode, text, userTranscription, groupSize, formattedText]);

  // Highlight current character if showCharacter and not transcription
  const displayedText = useMemo(() => {
    if (!showCharacter || currentIndex === null || transcriptionMode) return formattedText;
    const chars = formattedText.split('');
    const highlightIndex = currentIndex;
    if (highlightIndex >= 0 && highlightIndex < chars.length) {
      chars[highlightIndex] = `<span class="bg-teal-600 text-white px-1 rounded">${chars[highlightIndex]}</span>`;
    }
    return chars.join('');
  }, [formattedText, showCharacter, currentIndex, transcriptionMode]);

  // Unique keys from characterSet
  const keys = useMemo(() => {
    return Array.from(new Set(characterSet.split(''))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [characterSet]);

  // Format history entry text
  const formatHistoryText = (playedText: string) => {
    const trimmed = playedText.trimEnd();
    const groups = trimmed.split(' ');
    const formattedGroups = groups.map((group, idx) => {
      if (idx === groups.length - 1 && group.length < groupSize) {
        return group;
      }
      return group.padEnd(groupSize, '_');
    });
    return formattedGroups.join(' ').replace(/\n/g, '\n');
  };

  // Preview for minimized history: last group of latest entry
  const historyPreview = useMemo(() => {
    if (history.length === 0) return null;
    const latestEntry = history[history.length - 1];
    const groups = latestEntry.playedText.trimEnd().split(' ');
    const lastGroup = groups[groups.length - 1] || '';
    return {
      lastGroup: formatHistoryText(lastGroup),  // Apply padding if needed, but since last, no pad
      score: latestEntry.score,
    };
  }, [history, groupSize]);

  if (!showCharacter && !transcriptionMode) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 text-center text-gray-400">
        Character display is hidden
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6">
        <h2 className="text-xl font-semibold text-teal-400 mb-4">
          {transcriptionMode ? 'Transcription' : 'Displayed Text'}
        </h2>
        <pre className="whitespace-pre-wrap break-words font-mono text-lg text-gray-200">
          {transcriptionMode ? (
            score ? (
              <>
                <div className="mb-4">
                  Score: {score.score}/10 ({score.correct}/{score.total})
                </div>
                <span dangerouslySetInnerHTML={{ __html: highlightedText }} />
              </>
            ) : (
              <>
                <textarea
                  value={userTranscription}
                  onChange={(e) => onTranscriptionChange(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono mb-4 min-h-[100px] resize-y"
                  placeholder="Type what you hear..."
                />
                <div className="flex flex-wrap gap-2 mb-4">
                  {keys.map((k) => (
                    <button
                      key={k}
                      onClick={() => onTranscriptionChange(userTranscription + k)}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded-md text-white font-mono"
                    >
                      {k}
                    </button>
                  ))}
                </div>
                {formattedUserInput}
              </>
            )
          ) : (
            <span dangerouslySetInnerHTML={{ __html: displayedText }} />
          )}
        </pre>
      </div>

      {history.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-semibold text-teal-400 mb-4 cursor-pointer" onClick={() => setHistoryExpanded(!historyExpanded)}>
            History ({history.length})
          </h2>
          {historyExpanded ? (
            <div className="space-y-4">
              {history.slice().reverse().map((entry, idx) => (  // Reversed for latest first
                <div key={idx} className="border-t border-gray-700 pt-4">
                  <p className="text-sm text-gray-400 mb-2">{new Date(entry.timestamp).toLocaleString()}</p>
                  <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-200">
                    {formatHistoryText(entry.playedText)}
                  </pre>
                  {entry.score && (
                    <p className="text-sm text-teal-400 mt-2">
                      Score: {entry.score.score}/10 ({entry.score.correct}/{entry.score.total})
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            historyPreview && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Last session's final group (preview):</p>
                <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-200">
                  {historyPreview.lastGroup}
                </pre>
                {historyPreview.score && (
                  <p className="text-sm text-teal-400">
                    Score: {historyPreview.score.score}/10 ({historyPreview.score.correct}/{historyPreview.score.total})
                  </p>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterDisplay;
