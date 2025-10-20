// Updated ./src/types.ts
export interface MorseSettings {
  wpm: number;
  frequency: number;
  volume: number;
  charSpaceDots: number;
  wordSpaceDots: number;
  groupSize: number;
  totalChars: number;
}

export type Lesson = {
  id: string;
  name: string;
  chars: string;
};

export type Score = {
  correct: number;
  total: number;
  percentage: number;
};
