import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle({ compact = false }) {
  const { isLight, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span className={`theme-toggle-pill ${!compact && isLight ? 'theme-toggle-pill-right' : ''}`}>
        {isLight ? <Moon size={14} /> : <Sun size={14} />}
      </span>
      {!compact && <span className="theme-toggle-label">{isLight ? 'Dark' : 'Light'}</span>}
    </button>
  );
}
