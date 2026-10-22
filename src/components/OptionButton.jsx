import React from 'react';
import { Loader2 } from 'lucide-react';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export default function OptionButton({
  index = 0,
  option,
  isSelected = false,
  isDisabled = false,
  isSubmitting = false,
  onClick
}) {
  const letter = OPTION_LETTERS[index] || (index + 1);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled || isSubmitting) return;
    if (typeof onClick === 'function') {
      onClick(option.id);
    }
  };

  return (
    <button
      id={`card-opcion-${letter.toString().toLowerCase()}`}
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
      style={{
        pointerEvents: isDisabled ? 'none' : 'auto',
        touchAction: 'manipulation'
      }}
      className={`casual-option-btn ${isSelected ? 'selected' : ''} ${
        isSubmitting && isSelected ? 'processing' : ''
      } ${isDisabled && !isSelected ? 'opacity-40 grayscale-20' : ''}`}
    >
      <div className="casual-option-badge">
        {isSubmitting && isSelected ? (
          <Loader2 size={24} className="animate-spin text-white" />
        ) : (
          letter
        )}
      </div>
      <div className="flex-1 flex flex-col items-start justify-center text-left">
        <span className="font-semibold select-none leading-snug">
          {option.text}
        </span>
        {isSubmitting && isSelected && (
          <span className="text-xs font-bold text-blue-700 animate-pulse mt-0.5">
            Guardando tu respuesta...
          </span>
        )}
      </div>
    </button>
  );
}

