import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ compact = false }) {
  const { isLight, isAuto, toggleTheme, useAutoSchedule } = useTheme();

  const onClick = (e) => {
    if (e.shiftKey) {
      e.preventDefault();
      useAutoSchedule();
      return;
    }
    toggleTheme();
  };

  const nextMode = isLight ? 'dark' : 'light';
  const title = isAuto
    ? `${isLight ? 'Light' : 'Dark'} (follows time: ~6am–6pm light). Click: always ${nextMode}. Shift+click: auto.`
    : `Always ${isLight ? 'light' : 'dark'}. Click: switch to ${nextMode}. Shift+click: follow time again.`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`}
      title={title}
      aria-label={title}
    >
      <span className={`theme-toggle-pill ${!compact && isLight ? 'theme-toggle-pill-right' : ''}`}>
        {isLight ? <Moon size={14} /> : <Sun size={14} />}
        {isAuto && (
          <span className="theme-toggle-auto-dot" aria-hidden title="Auto by time" />
        )}
      </span>
      {!compact && (
        <span className="theme-toggle-label">
          {isAuto ? 'Auto' : isLight ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
