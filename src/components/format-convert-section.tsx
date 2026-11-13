
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MediaConverter from "../../modules/media-converter/src/MediaConverterModule";

interface FormatConvertSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setStatusText: (text: string) => void;
}

export default function FormatConvertSection({
  isOpen,
  onToggle,
  isLoading,
  setIsLoading,
  setStatusText,
}: FormatConvertSectionProps) {
  const { t } = useTranslation();

  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");

  const pickConvertFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["video/quicktime", "video/mp4"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedUri(asset.uri);
        setSelectedName(asset.name);
        setStatusText(t("formatConvert.fileSelected"));
      }
    } catch (error) {
      console.error("Dosya seçme hatası:", error);
      Alert.alert(
        t("common.error"),
        t("formatConvert.pickError"),
      );
    }
  };

  const convertVideoToMp4 = async () => {
    if (!selectedUri) return;

    try {
      setIsLoading(true);
      setStatusText(t("formatConvert.converting"));

      const resultUri =
        await MediaConverter.convertVideoToMp4(selectedUri);

      setStatusText(t("formatConvert.success"));

      await Sharing.shareAsync(resultUri, {
        mimeType: "video/mp4",
        dialogTitle: t("formatConvert.share"),
      });
    } catch (error) {
      console.error("MP4 dönüştürme hatası:", error);

      Alert.alert(
        t("formatConvert.errorTitle"),
        error instanceof Error
          ? error.message
          : t("formatConvert.convertError"),
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
          <Text style={styles.accordionIcon}>🔄</Text>

          <View>
            <Text style={styles.accordionTitle}>
              {t("formatConvert.title")}
            </Text>

            <Text style={styles.accordionSub}>
              {t("formatConvert.subtitle")}
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
            style={styles.selectButton}
            onPress={pickConvertFile}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {selectedName || t("formatConvert.selectFile")}
            </Text>
          </TouchableOpacity>

          {selectedUri && (
            <>
              <Text style={styles.fileInfoText}>
                {t("formatConvert.selected")}: {selectedName}
              </Text>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isLoading && styles.disabledButton,
                ]}
                onPress={convertVideoToMp4}
                disabled={isLoading}
              >
                <Text style={styles.actionButtonText}>
                  {t("formatConvert.convert")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedUri(null);
                  setSelectedName("");
                }}
                disabled={isLoading}
              >
                <Text style={styles.resetButtonText}>
                  {t("formatConvert.clear")}
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
  selectButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: "#FF9500",
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
