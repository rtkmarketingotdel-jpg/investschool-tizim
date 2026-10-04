import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.json';
import ru from './locales/ru.json';

const stored = (() => {
  try {
    return localStorage.getItem('lang');
  } catch {
    return null;
  }
})();

i18n.use(initReactI18next).init({
  resources: { uz: { translation: uz }, ru: { translation: ru } },
  lng: stored === 'ru' ? 'ru' : 'uz',
  fallbackLng: 'uz',
  interpolation: { escapeValue: false },
});

export const setLanguage = (lang: 'uz' | 'ru') => {
  try {
    localStorage.setItem('lang', lang);
  } catch { /* storage unavailable */ }
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
};

export default i18n;
