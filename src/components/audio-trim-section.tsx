
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AudioTrimmer from "../../modules/audio-trimmer/src/AudioTrimmerModule";
import { formatFileSize } from "../utils/media-helpers";

interface AudioTrimSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setStatusText: (text: string) => void;
}

export default function AudioTrimSection({
  isOpen,
  onToggle,
  isLoading,
  setIsLoading,
  setStatusText,
}: AudioTrimSectionProps) {
  const { t } = useTranslation();

  const [selectedAudioUri, setSelectedAudioUri] = useState<string | null>(null);
  const [selectedAudioName, setSelectedAudioName] = useState<string>("");
  const [audioStartTime, setAudioStartTime] = useState("0");
  const [audioEndTime, setAudioEndTime] = useState("10");

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        setSelectedAudioUri(asset.uri);
        setSelectedAudioName(asset.name);
        setAudioStartTime("0");
        setAudioEndTime("10");
        setStatusText(t("audioTrim.fileSelected"));
      }
    } catch (error) {
      console.error("Ses seçme hatası:", error);

      Alert.alert(
        t("common.error"),
        t("audioTrim.pickError"),
      );
    }
  };

  const trimAudio = async () => {
    if (!selectedAudioUri) return;

    const startSeconds = Number(audioStartTime.replace(",", "."));
    const endSeconds = Number(audioEndTime.replace(",", "."));

    if (
      !Number.isFinite(startSeconds) ||
      !Number.isFinite(endSeconds) ||
      startSeconds < 0 ||
      endSeconds <= startSeconds
    ) {
      Alert.alert(
        t("audioTrim.invalidTitle"),
        t("audioTrim.invalidDuration"),
      );
      return;
    }

    try {
      setIsLoading(true);
      setStatusText(t("audioTrim.trimming"));

      const result = await AudioTrimmer.trimAudio(
        selectedAudioUri,
        Math.round(startSeconds * 1000),
        Math.round(endSeconds * 1000),
      );

      setStatusText(
        t("audioTrim.success", {
          size: formatFileSize(result.size),
        }),
      );

      await Sharing.shareAsync(result.uri, {
        mimeType: "audio/mp4",
        dialogTitle: t("audioTrim.share"),
      });
    } catch (error) {
      console.error("Ses kesme hatası:", error);

      setStatusText(t("audioTrim.failed"));

      Alert.alert(
        t("audioTrim.errorTitle"),
        error instanceof Error
          ? error.message
          : t("audioTrim.trimError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.accordionCard}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.accordionTitleRow}>
          <Text style={styles.accordionIcon}>🎧</Text>

          <View>
            <Text style={styles.accordionTitle}>
              {t("audioTrim.title")}
            </Text>

            <Text style={styles.accordionSub}>
              {t("audioTrim.subtitle")}
            </Text>
          </View>
        </View>

        <Text style={styles.chevron}>
          {isOpen ? "▲" : "▼"}
        </Text>
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
                ? t("audioTrim.selectAnother")
                : t("audioTrim.selectAudio")}
            </Text>
          </TouchableOpacity>

          {selectedAudioUri && (
            <>
              <Text style={styles.fileInfoText}>
                {t("audioTrim.selected")}: {selectedAudioName}
              </Text>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>
                    {t("audioTrim.start")}
                  </Text>

                  <TextInput
                    style={styles.timeInput}
                    value={audioStartTime}
                    onChangeText={setAudioStartTime}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#888"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>
                    {t("audioTrim.end")}
                  </Text>

                  <TextInput
                    style={styles.timeInput}
                    value={audioEndTime}
                    onChangeText={setAudioEndTime}
                    keyboardType="decimal-pad"
                    placeholder="10"
                    placeholderTextColor="#888"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.trimAudioButton,
                  isLoading && styles.disabledButton,
                ]}
                onPress={trimAudio}
                disabled={isLoading}
              >
                <Text style={styles.actionButtonText}>
                  {t("audioTrim.trim")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedAudioUri(null);
                  setSelectedAudioName("");
                  setAudioStartTime("0");
                  setAudioEndTime("10");
                }}
                disabled={isLoading}
              >
                <Text style={styles.resetButtonText}>
                  {t("audioTrim.clear")}
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
  accordionIcon: { fontSize: 22 },
  accordionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  accordionSub: { color: "#8E8E93", fontSize: 12, marginTop: 2 },
  chevron: { color: "#8E8E93", fontSize: 12, marginLeft: 8 },
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
  rowInputs: { flexDirection: "row", gap: 10 },
  label: { color: "#ccc", fontSize: 13, marginBottom: 4 },
  timeInput: {
    backgroundColor: "#2C2C2E",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#3A3A3C",
  },
  trimAudioButton: {
    backgroundColor: "#AF52DE",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#48484A" },
  actionButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  resetButton: {
    backgroundColor: "#FF3B30",
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  resetButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  fileInfoText: { color: "#aaa", fontSize: 13 },
});
