
import { changeAppLanguage, type AppLanguage } from "@/i18n";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [isChanging, setIsChanging] = useState(false);

  const currentLanguage = i18n.resolvedLanguage?.startsWith("en")
    ? "en"
    : "tr";

  const selectLanguage = async (language: AppLanguage) => {
    if (language === currentLanguage || isChanging) return;

    try {
      setIsChanging(true);
      await changeAppLanguage(language);
    } catch (error) {
      console.error("Dil değiştirme hatası:", error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.title}>{t("settings.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("settings.language")}
        </Text>

        <Text style={styles.description}>
          {t("settings.languageDescription")}
        </Text>

        <View style={styles.languageCard}>
          <Pressable
            style={styles.languageOption}
            onPress={() => selectLanguage("tr")}
            disabled={isChanging}
          >
            <View style={styles.languageInfo}>
              <Text style={styles.flag}>🇹🇷</Text>
              <Text style={styles.languageName}>
                {t("settings.turkish")}
              </Text>
            </View>

            {currentLanguage === "tr" && (
              <Text style={styles.selectedText}>✓</Text>
            )}
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.languageOption}
            onPress={() => selectLanguage("en")}
            disabled={isChanging}
          >
            <View style={styles.languageInfo}>
              <Text style={styles.flag}>🇬🇧</Text>
              <Text style={styles.languageName}>
                {t("settings.english")}
              </Text>
            </View>

            {currentLanguage === "en" && (
              <Text style={styles.selectedText}>✓</Text>
            )}
          </Pressable>
        </View>

        {isChanging && (
          <ActivityIndicator
            color="#007AFF"
            style={styles.loader}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backText: {
    color: "#007AFF",
    fontSize: 38,
    lineHeight: 42,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 40,
  },
  section: {
    width: "100%",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    color: "#8E8E93",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  languageCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  languageOption: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flag: {
    fontSize: 24,
  },
  languageName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  selectedText: {
    color: "#007AFF",
    fontSize: 22,
    fontWeight: "700",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#38383A",
  },
  loader: {
    marginTop: 20,
  },
});
