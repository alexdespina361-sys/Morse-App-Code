
import React from 'react';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
}

const Slider: React.FC<SliderProps> = ({ label, min, max, step, value, onChange, unit }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2 flex justify-between">
        <span>{label}</span>
        <span className="font-semibold text-teal-400">{value}{unit && ` ${unit}`}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
      />
    </div>
  );
};

export default Slider;
