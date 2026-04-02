import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

const resources = {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
} as const;

const device = Localization.getLocales()[0]?.languageCode ?? 'en';

void i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources,
    lng: ['en', 'es', 'fr', 'de'].includes(device) ? device : 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});

export function setAppLanguage(code: string) {
    void i18n.changeLanguage(code);
}

export default i18n;