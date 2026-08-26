import React from 'react';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function OptionButton({
  index = 0,
  option,
  isSelected = false,
  isCorrect = false,
  isIncorrect = false,
  isDisabled = false,
  onClick
}) {
  const letter = OPTION_LETTERS[index] || (index + 1);

  let stateClasses = '';
  if (isSelected) stateClasses += ' selected';
  if (isCorrect) stateClasses += ' correct';
  if (isIncorrect) stateClasses += ' incorrect';

  return (
    <button
      type="button"
      onClick={() => onClick(option.id)}
      disabled={isDisabled}
      className={`casual-option-btn ${stateClasses}`}
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
