import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Theme } from '../types';

const THEME_STORAGE_KEY = '@lumina:theme';
const STORAGE_KEY = '@lumina:theme'; // For useTheme hook compatibility

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('system');

  const applyTheme = useCallback((themeValue: Theme) => {
    const root = window.document.documentElement;
    
    if (themeValue === 'dark' || (themeValue === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
        root.classList.remove('light');
    } else {
        root.classList.add('light');
        root.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const initTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
        const initialTheme = storedTheme || 'system';
        setThemeState(initialTheme);
        applyTheme(initialTheme);
      } catch (error) {
        console.error('[ThemeProvider] Failed to load theme:', error);
        setThemeState('system');
        applyTheme('system');
      }
    };
    
    initTheme();
  }, [applyTheme]);
  
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error('[ThemeProvider] Failed to save theme:', error);
    }
  };
  
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Re-apply theme only if it's set to system
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return React.createElement(ThemeContext.Provider, { value: { theme, setTheme } }, children);
};

// Export hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}