import React from 'react';

export interface ToggleSwitchProps {
  id?: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  description,
  error,
  size = 'md',
  className = '',
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const inputId = id || `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = !!error;

  // Size variants
  const sizeClasses = {
    sm: {
      switch: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
    },
    md: {
      switch: 'w-10 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-5',
    },
    lg: {
      switch: 'w-12 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-6',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <label 
            htmlFor={inputId}
            className={`
              block text-sm font-medium cursor-pointer
              ${disabled 
                ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                : 'text-gray-700 dark:text-gray-300'
              }
              ${hasError ? 'text-red-600 dark:text-red-400' : ''}
            `}
          >
            {label}
          </label>
          {description && !error && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        
        <div className="flex-shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-labelledby={inputId}
            disabled={disabled}
            onClick={handleToggle}
            className={`
              relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              dark:focus:ring-offset-gray-800
              ${currentSize.switch}
              ${disabled 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer'
              }
              ${checked 
                ? hasError
                  ? 'bg-red-500 dark:bg-red-600'
                  : 'bg-blue-600 dark:bg-blue-500'
                : 'bg-gray-200 dark:bg-gray-600'
              }
            `}
          >
            <span
              className={`
                inline-block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out
                ${currentSize.thumb}
                ${checked ? currentSize.translate : 'translate-x-0'}
              `}
            />
          </button>
          
          {/* Hidden input for form compatibility */}
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={() => {}} // Controlled by button click
            disabled={disabled}
            className="sr-only"
          />
        </div>
      </div>
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default ToggleSwitch;