import React from 'react';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function OptionButton({
  index = 0,
  option,
  isSelected = false,
  isDisabled = false,
  onClick
}) {
  const letter = OPTION_LETTERS[index] || (index + 1);

  return (
    <button
      type="button"
      onClick={() => onClick(option.id)}
      disabled={isDisabled}
      className={`casual-option-btn ${isSelected ? 'selected' : ''}`}
    >
      <div className="casual-option-badge">
        {letter}
      </div>
      <span className="flex-1 text-left font-semibold select-none leading-snug">
        {option.text}
      </span>
    </button>
  );
}
