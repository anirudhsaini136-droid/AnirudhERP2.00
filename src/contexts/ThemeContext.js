import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

/** Local hour when light theme starts (inclusive). */
const DAY_START_HOUR = 6;
/** Local hour when light theme ends (exclusive → dark from this hour). */
const DAY_END_HOUR = 18;

export function getScheduledTheme() {
  const h = new Date().getHours();
  return h >= DAY_START_HOUR && h < DAY_END_HOUR ? 'light' : 'dark';
}

function loadPreference() {
  const p = localStorage.getItem('themePreference');
  if (p === 'auto' || p === 'light' || p === 'dark') return p;
  const legacy = localStorage.getItem('theme');
  if (legacy === 'light' || legacy === 'dark') return legacy;
  return 'auto';
}

export const ThemeProvider = ({ children }) => {
  const [preference, setPreference] = useState(loadPreference);
  const [scheduleTick, setScheduleTick] = useState(0);

  const effectiveTheme = useMemo(() => {
    if (preference !== 'auto') return preference;
    return getScheduledTheme();
  }, [preference, scheduleTick]);

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', effectiveTheme === 'light');
    localStorage.setItem('themePreference', preference);
  }, [effectiveTheme, preference]);

  useEffect(() => {
    if (preference !== 'auto') return undefined;
    const bump = () => setScheduleTick((t) => t + 1);
    const id = window.setInterval(bump, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') bump();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [preference]);

  const toggleTheme = useCallback(() => {
    setPreference((prev) => {
      if (prev === 'auto') {
        const scheduled = getScheduledTheme();
        return scheduled === 'light' ? 'dark' : 'light';
      }
      return prev === 'light' ? 'dark' : 'light';
    });
  }, []);

  const useAutoSchedule = useCallback(() => {
    setPreference('auto');
  }, []);

  const value = useMemo(
    () => ({
      theme: effectiveTheme,
      themePreference: preference,
      isLight: effectiveTheme === 'light',
      isAuto: preference === 'auto',
      toggleTheme,
      useAutoSchedule,
    }),
    [effectiveTheme, preference, toggleTheme, useAutoSchedule]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
};
