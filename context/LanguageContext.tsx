'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, Translations } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('jrscargo_lang');
      if (stored === 'es' || stored === 'en') {
        setLanguageState(stored);
        document.documentElement.lang = stored;
      } else {
        // Check browser preference
        const navLang = navigator.language || '';
        if (navLang.toLowerCase().startsWith('en')) {
          setLanguageState('en');
          document.documentElement.lang = 'en';
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('jrscargo_lang', lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore
    }
  };

  const toggleLanguage = () => {
    const next = language === 'es' ? 'en' : 'es';
    setLanguage(next);
  };

  // Safe fallback while hydrating
  const t = translations[language] || translations['es'];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return default Spanish if used outside provider
    return {
      language: 'es' as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: translations['es'],
    };
  }
  return context;
}
