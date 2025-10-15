import React from 'react';

interface CharacterDisplayProps {
  text: string;
  showCharacter: boolean;
  currentIndex: number | null;
}

const CharacterDisplay: React.FC<CharacterDisplayProps> = ({ text, showCharacter, currentIndex }) => {
  if (!showCharacter) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center h-32 flex items-center justify-center">
        <p className="text-gray-500 italic">Character display is hidden</p>
      </div>
    );
  }

  if (text === '' || currentIndex === null) {
    return (
        <div className="bg-gray-800 rounded-lg p-6 text-left min-h-[16rem] w-full flex items-center justify-center">
            <p className="text-gray-500 italic">Press Start to begin</p>
        </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-left min-h-[16rem] w-full overflow-y-auto">
      <p className="font-mono text-base tracking-wider text-gray-300 break-words whitespace-pre-wrap">
        {text.split('').map((char, index) => {
            if (index > currentIndex) {
                return null;
            }
            return (
              <span key={index}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
        })}
      </p>
    </div>
  );
};

export default CharacterDisplay;