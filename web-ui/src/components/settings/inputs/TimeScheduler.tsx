import React from 'react';

export interface TimeSchedulerProps {
  id?: string;
  label: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  fromHour: number;
  fromMin: number;
  toHour: number;
  toMin: number;
  onTimeChange: (fromHour: number, fromMin: number, toHour: number, toMin: number) => void;
  days: number; // Bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
  onDaysChange: (days: number) => void;
  disabled?: boolean;
  error?: string;
  description?: string;
  className?: string;
}

const DAYS = [
  { name: 'Mon', value: 1 },
  { name: 'Tue', value: 2 },
  { name: 'Wed', value: 4 },
  { name: 'Thu', value: 8 },
  { name: 'Fri', value: 16 },
  { name: 'Sat', value: 32 },
  { name: 'Sun', value: 64 },
];

const TimeScheduler: React.FC<TimeSchedulerProps> = ({
  id,
  label,
  enabled,
  onEnabledChange,
  fromHour,
  fromMin,
  toHour,
  toMin,
  onTimeChange,
  days,
  onDaysChange,
  disabled = false,
  error,
  description,
  className = '',
}) => {
  const baseId = id || `scheduler-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasError = !!error;

  const formatTime = (hour: number, min: number): string => {
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeString: string): { hour: number; min: number } => {
    const [hourStr, minStr] = timeString.split(':');
    return {
      hour: parseInt(hourStr, 10) || 0,
      min: parseInt(minStr, 10) || 0,
    };
  };

  const handleFromTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { hour, min } = parseTime(e.target.value);
    onTimeChange(hour, min, toHour, toMin);
  };

  const handleToTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { hour, min } = parseTime(e.target.value);
    onTimeChange(fromHour, fromMin, hour, min);
  };

  const handleDayToggle = (dayValue: number) => {
    if (disabled || !enabled) return;
    
    const newDays = days & dayValue ? days & ~dayValue : days | dayValue;
    onDaysChange(newDays);
  };

  const isDaySelected = (dayValue: number): boolean => {
    return (days & dayValue) !== 0;
  };

  const isFieldDisabled = disabled || !enabled;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Enable/Disable Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <label 
            htmlFor={`${baseId}-enabled`}
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
            aria-checked={enabled}
            aria-labelledby={`${baseId}-enabled`}
            disabled={disabled}
            onClick={() => onEnabledChange(!enabled)}
            className={`
              relative inline-flex w-10 h-5 items-center rounded-full transition-colors duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              dark:focus:ring-offset-gray-800
              ${disabled 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer'
              }
              ${enabled 
                ? hasError
                  ? 'bg-red-500 dark:bg-red-600'
                  : 'bg-blue-600 dark:bg-blue-500'
                : 'bg-gray-200 dark:bg-gray-600'
              }
            `}
          >
            <span
              className={`
                inline-block w-4 h-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out
                ${enabled ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Schedule Configuration (visible when enabled) */}
      {enabled && (
        <div className="ml-4 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          {/* Time Range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Time Range
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor={`${baseId}-from`} className="text-sm text-gray-600 dark:text-gray-400">
                  From:
                </label>
                <input
                  id={`${baseId}-from`}
                  type="time"
                  value={formatTime(fromHour, fromMin)}
                  onChange={handleFromTimeChange}
                  disabled={isFieldDisabled}
                  className={`
                    input text-sm
                    ${hasError 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-400' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-600 dark:focus:border-blue-400'
                    }
                    ${isFieldDisabled 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' 
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }
                    block border rounded-md px-3 py-1
                    focus:outline-none focus:ring-2 focus:ring-opacity-50
                    transition-colors duration-200
                  `}
                />
              </div>
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <div className="flex items-center gap-2">
                <label htmlFor={`${baseId}-to`} className="text-sm text-gray-600 dark:text-gray-400">
                  To:
                </label>
                <input
                  id={`${baseId}-to`}
                  type="time"
                  value={formatTime(toHour, toMin)}
                  onChange={handleToTimeChange}
                  disabled={isFieldDisabled}
                  className={`
                    input text-sm
                    ${hasError 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-400' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200 dark:border-gray-600 dark:focus:border-blue-400'
                    }
                    ${isFieldDisabled 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500' 
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }
                    block border rounded-md px-3 py-1
                    focus:outline-none focus:ring-2 focus:ring-opacity-50
                    transition-colors duration-200
                  `}
                />
              </div>
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Days of Week
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.name}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  disabled={isFieldDisabled}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md border transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    dark:focus:ring-offset-gray-800
                    ${isFieldDisabled 
                      ? 'cursor-not-allowed opacity-50' 
                      : 'cursor-pointer'
                    }
                    ${isDaySelected(day.value)
                      ? hasError
                        ? 'bg-red-500 text-white border-red-500 dark:bg-red-600 dark:border-red-600'
                        : 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {day.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Select the days when this schedule should be active
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default TimeScheduler;