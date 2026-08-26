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
      className={`option-btn-3d ${stateClasses}`}
      style={{
        animationDelay: `${index * 80}ms`
      }}
    >
      <div className="option-badge">
        {letter}
      </div>
      <span className="flex-1 text-left select-none">
        {option.text}
      </span>
    </button>
  );
}
