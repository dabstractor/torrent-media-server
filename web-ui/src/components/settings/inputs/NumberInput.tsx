import React from 'react';

export interface NumberInputProps {
  id?: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  id,
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  placeholder,
  disabled = false,
  error,
  description,
  required = false,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  const inputId = id || `number-input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = !!error;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {unit && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({unit})
          </span>
        )}
      </div>
      
      <div className="relative">
        <input
          id={inputId}
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            input w-full
            ${hasError 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-400' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-600 dark:focus:border-blue-400'
            }
            ${disabled 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' 
              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }
            block border rounded-md px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            transition-colors duration-200
          `}
        />
        {unit && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {unit}
            </span>
          </div>
        )}
      </div>
      
      {description && !error && (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default NumberInput;