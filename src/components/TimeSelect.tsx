import React, { useEffect } from 'react';
import { clampScheduleTimeString, MIN_SCHEDULE_HOUR, MAX_SCHEDULE_HOUR } from '../utils/dateParser';

interface TimeSelectProps {
  value: string; // Format "HH:MM" e.g. "14:40"
  onChange: (value: string) => void;
  className?: string;
}

export const TimeSelect: React.FC<TimeSelectProps> = ({ value, onChange, className = '' }) => {
  const clampedValue = clampScheduleTimeString(value || '00:00');

  useEffect(() => {
    if (value && value !== clampedValue) {
      onChange(clampedValue);
    }
  }, [value, clampedValue, onChange]);

  const parts = clampedValue.split(':');
  const hh = (parts[0] || '00').padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');

  // Hours array from 00 to 23 (12:00 AM / Midnight to 11:00 PM)
  const hours = Array.from({ length: MAX_SCHEDULE_HOUR - MIN_SCHEDULE_HOUR + 1 }, (_, i) => String(i + MIN_SCHEDULE_HOUR).padStart(2, '0'));

  // Minutes '00'-'59'
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHH = e.target.value;
    onChange(clampScheduleTimeString(`${newHH}:${mm}`));
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMM = e.target.value;
    onChange(clampScheduleTimeString(`${hh}:${newMM}`));
  };

  return (
    <div className={`flex items-center space-x-1.5 min-w-[140px] ${className}`}>
      <div className="relative flex-1">
        <select
          value={hh}
          onChange={handleHourChange}
          className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl px-2 py-2.5 h-[42px] text-gray-200 text-xs sm:text-sm font-mono focus:outline-none focus:border-[#A88B4B] cursor-pointer appearance-none text-center font-bold pr-5"
        >
          {hours.map((h) => (
            <option key={h} value={h} className="bg-[#15181E] text-white py-1">
              {h}h
            </option>
          ))}
        </select>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">▼</span>
      </div>

      <span className="text-[#A88B4B] font-bold font-mono text-sm sm:text-base">:</span>

      <div className="relative flex-1">
        <select
          value={mm}
          onChange={handleMinuteChange}
          className="w-full bg-[#0A0C10] border border-[#1F2229] rounded-xl px-2 py-2.5 h-[42px] text-gray-200 text-xs sm:text-sm font-mono focus:outline-none focus:border-[#A88B4B] cursor-pointer appearance-none text-center font-bold pr-5"
        >
          {minutes.map((m) => (
            <option key={m} value={m} className="bg-[#15181E] text-white py-1">
              {m}min
            </option>
          ))}
        </select>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">▼</span>
      </div>
    </div>
  );
};


