import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AudioConvertSection from "../components/audio-convert-section";
import AudioTrimSection from "../components/audio-trim-section";
import FormatConvertSection from "../components/format-convert-section";
import VideoEditorSection from "../components/video-editor-section";
import VideoMergeSection from "../components/video-merge-section";
import SplashScreen from "./splash";

type ActiveSection = "convert" | "merge" | "audio" | "audioConvert" | null;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [isSplashReady, setIsSplashReady] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);

  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  const [selectedVideoSize, setSelectedVideoSize] = useState<number | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("");

  const toggleSection = (section: ActiveSection) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveSection((prev) => (prev === section ? null : section));
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedVideoUri(asset.uri);
        setSelectedVideoSize(asset.size ?? null);
        setStatusText(t("home.videoSelected"));
        setActiveSection(null);
      }
    } catch (error) {
      console.error("Video seçme hatası:", error);

      Alert.alert(t("common.error"), t("home.pickError"));
    }
  };

  const resetVideoSelection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedVideoUri(null);
    setSelectedVideoSize(null);
    setStatusText(t("common.ready"));
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#121212" }}>
      {!isSplashReady && (
        <SplashScreen onFinish={() => setIsSplashReady(true)} />
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerSide} />

          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>{t("app.name")}</Text>
            <Text style={styles.subtitle}>{t("app.subtitle")}</Text>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push("./settings")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("settings.title")}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {selectedVideoUri ? (
          <VideoEditorSection
            videoUri={selectedVideoUri}
            videoSize={selectedVideoSize}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setStatusText={setStatusText}
            onReset={resetVideoSelection}
          />
        ) : (
          <TouchableOpacity
            style={styles.heroSelectCard}
            onPress={pickVideo}
            activeOpacity={0.85}
          >
            <View style={styles.heroIconCircle}>
              <Text style={styles.heroIcon}>🎬</Text>
            </View>

            <Text style={styles.heroTitle}>{t("home.selectVideo")}</Text>

            <Text style={styles.heroDesc}>{t("home.subtitle")}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.toolsHeader}>{t("home.otherTools")}</Text>

        <FormatConvertSection
          isOpen={activeSection === "convert"}
          onToggle={() => toggleSection("convert")}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          setStatusText={setStatusText}
        />

        <VideoMergeSection
          isOpen={activeSection === "merge"}
          onToggle={() => toggleSection("merge")}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          setStatusText={setStatusText}
        />

        <AudioTrimSection
          isOpen={activeSection === "audio"}
          onToggle={() => toggleSection("audio")}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          setStatusText={setStatusText}
        />

        <AudioConvertSection
          isOpen={activeSection === "audioConvert"}
          onToggle={() => toggleSection("audioConvert")}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          setStatusText={setStatusText}
        />

        {isLoading && (
          <ActivityIndicator color="#fff" size="large" style={styles.loader} />
        )}

        {statusText ? <Text style={styles.status}>{statusText}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerSide: {
    width: 42,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: 13, color: "#8E8E93", marginTop: 4 },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38383A",
  },
  settingsIcon: {
    color: "#fff",
    fontSize: 23,
  },
  heroSelectCard: {
    width: "100%",
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    marginBottom: 24,
  },
  heroIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 122, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroIcon: { fontSize: 26 },
  heroTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  heroDesc: { color: "#8E8E93", fontSize: 13, textAlign: "center" },
  toolsHeader: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  loader: { marginTop: 14 },
  status: {
    color: "#aaa",
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
  },
});
