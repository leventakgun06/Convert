import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import AudioConverter from "../../modules/audio-converter/src/AudioConverterModule";

interface AudioConvertSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setStatusText: (text: string) => void;
}

export default function AudioConvertSection({
  isOpen,
  onToggle,
  isLoading,
  setIsLoading,
  setStatusText,
}: AudioConvertSectionProps) {
  const { t } = useTranslation();

  const [selectedAudioUri, setSelectedAudioUri] = useState<string | null>(null);
  const [selectedAudioName, setSelectedAudioName] = useState("");
  const [outputUri, setOutputUri] = useState<string | null>(null);

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) return;

      const asset = result.assets[0];
      const isMp3 =
        asset.name.toLowerCase().endsWith(".mp3") ||
        asset.mimeType?.toLowerCase() === "audio/mpeg";

      if (!isMp3) {
        Alert.alert(t("audioConvert.errorTitle"), t("audioConvert.mp3Only"));
        return;
      }

      setSelectedAudioUri(asset.uri);
      setSelectedAudioName(asset.name);
      setOutputUri(null);
      setStatusText(t("audioConvert.fileSelected"));
    } catch (error) {
      console.error("MP3 seçme hatası:", error);

      Alert.alert(t("common.error"), t("audioConvert.pickError"));
    }
  };

  const convertAudio = async () => {
    if (!selectedAudioUri) return;

    try {
      setIsLoading(true);
      setOutputUri(null);
      setStatusText(t("audioConvert.converting"));

      const resultUri = await AudioConverter.convertMp3ToM4a(selectedAudioUri);

      setOutputUri(resultUri);
      setStatusText(t("audioConvert.success"));
    } catch (error) {
      console.error("MP3 → M4A dönüştürme hatası:", error);

      setStatusText(t("audioConvert.failed"));

      Alert.alert(
        t("audioConvert.errorTitle"),
        error instanceof Error ? error.message : t("audioConvert.convertError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const shareAudio = async () => {
    if (!outputUri) return;

    try {
      await Sharing.shareAsync(outputUri, {
        mimeType: "audio/x-m4a",
        dialogTitle: t("audioConvert.share"),
      });
    } catch (error) {
      console.error("M4A paylaşma hatası:", error);

      Alert.alert(t("common.error"), t("audioConvert.shareError"));
    }
  };

  const clearSelection = () => {
    setSelectedAudioUri(null);
    setSelectedAudioName("");
    setOutputUri(null);
    setStatusText("");
  };

  return (
    <View style={styles.accordionCard}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.accordionTitleRow}>
          <Text style={styles.accordionIcon}>🎵</Text>

          <View>
            <Text style={styles.accordionTitle}>{t("audioConvert.title")}</Text>

            <Text style={styles.accordionSub}>
              {t("audioConvert.subtitle")}
            </Text>
          </View>
        </View>

        <Text style={styles.chevron}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.accordionBody}>
          <TouchableOpacity
            style={styles.audioButton}
            onPress={pickAudio}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {selectedAudioName
                ? t("audioConvert.selectAnother")
                : t("audioConvert.selectAudio")}
            </Text>
          </TouchableOpacity>

          {selectedAudioUri && (
            <>
              <Text style={styles.fileInfoText}>
                {t("audioConvert.selected")}: {selectedAudioName}
              </Text>

              <View style={styles.formatInfo}>
                <Text style={styles.formatText}>MP3</Text>
                <Text style={styles.formatArrow}>→</Text>
                <Text style={styles.formatText}>M4A (AAC)</Text>
              </View>

              {!outputUri && (
                <TouchableOpacity
                  style={[
                    styles.convertButton,
                    isLoading && styles.disabledButton,
                  ]}
                  onPress={convertAudio}
                  disabled={isLoading}
                >
                  <Text style={styles.actionButtonText}>
                    {isLoading
                      ? t("audioConvert.converting")
                      : t("audioConvert.convert")}
                  </Text>
                </TouchableOpacity>
              )}

              {outputUri && (
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={shareAudio}
                  disabled={isLoading}
                >
                  <Text style={styles.actionButtonText}>
                    {t("audioConvert.share")}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.resetButton}
                onPress={clearSelection}
                disabled={isLoading}
              >
                <Text style={styles.resetButtonText}>
                  {t("audioConvert.clear")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  accordionCard: {
    width: "100%",
    backgroundColor: "#1C1C1E",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  accordionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  accordionIcon: {
    fontSize: 22,
  },
  accordionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  accordionSub: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: "#8E8E93",
    fontSize: 12,
    marginLeft: 8,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#2C2C2E",
  },
  audioButton: {
    backgroundColor: "#34C759",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  fileInfoText: {
    color: "#aaa",
    fontSize: 13,
  },
  formatInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: 14,
    backgroundColor: "#2C2C2E",
    borderRadius: 10,
  },
  formatText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  formatArrow: {
    color: "#34C759",
    fontSize: 20,
    fontWeight: "700",
  },
  convertButton: {
    backgroundColor: "#AF52DE",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  shareButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#48484A",
  },
  resetButton: {
    backgroundColor: "#FF3B30",
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
