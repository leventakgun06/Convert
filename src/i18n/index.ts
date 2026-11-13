
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import tr from "./locales/tr.json";
import en from "./locales/en.json";

export type AppLanguage = "tr" | "en";

const LANGUAGE_STORAGE_KEY = "convert-language";

const getInitialLanguage = async (): Promise<AppLanguage> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (savedLanguage === "tr" || savedLanguage === "en") {
      return savedLanguage;
    }
  } catch (error) {
    console.warn("Dil tercihi okunamadı:", error);
  }

  const deviceLanguage = getLocales()[0]?.languageCode?.toLowerCase();

  return deviceLanguage === "en" ? "en" : "tr";
};

const initializeI18n = async () => {
  const initialLanguage = await getInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    lng: initialLanguage,
    fallbackLng: "tr",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
};

export const i18nReady = initializeI18n();

export const changeAppLanguage = async (
  language: AppLanguage,
): Promise<void> => {
  await i18n.changeLanguage(language);

  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn("Dil tercihi kaydedilemedi:", error);
  }
};

export default i18n;
