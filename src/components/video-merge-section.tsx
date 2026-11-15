import * as DocumentPicker from "expo-document-picker";
import { Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MediaToolkit } from "react-native-media-toolkit";
import { formatFileSize, formatTime, toFilePath } from "../utils/media-helpers";

type MergeVideo = {
  uri: string;
  name: string;
  size?: number;
};

interface VideoMergeSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setStatusText: (text: string) => void;
}

export default function VideoMergeSection({
  isOpen,
  onToggle,
  isLoading,
  setIsLoading,
  setStatusText,
}: VideoMergeSectionProps) {
  const { t } = useTranslation();

  const [mergeVideos, setMergeVideos] = useState<MergeVideo[]>([]);

  const pickMergeVideos = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/mp4",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newVideos: MergeVideo[] = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
        }));

        setMergeVideos((current) => {
          const uniqueVideos = newVideos.filter(
            (video) => !current.some((item) => item.uri === video.uri),
          );
          return [...current, ...uniqueVideos];
        });

        setStatusText(
          t("videoMerge.fileSelected", {
            count: result.assets.length,
          }),
        );
      }
    } catch (error) {
      console.error("Video seçme hatası:", error);
      Alert.alert(t("common.error"), t("videoMerge.pickError"));
    }
  };

  const moveMergeVideo = (index: number, direction: number) => {
    setMergeVideos((current) => {
      const newList = [...current];
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= newList.length) return current;

      [newList[index], newList[targetIndex]] = [
        newList[targetIndex],
        newList[index],
      ];

      return newList;
    });
  };

  const removeMergeVideo = (index: number) => {
    setMergeVideos((current) => current.filter((_, i) => i !== index));
  };

  const mergeSelectedVideos = async () => {
    if (mergeVideos.length < 2) {
      Alert.alert(t("videoMerge.warningTitle"), t("videoMerge.minimumVideos"));
      return;
    }

    try {
      setIsLoading(true);
      setStatusText(t("videoMerge.converting"));

      const clipPaths = mergeVideos.map((video) => toFilePath(video.uri));
      const cachePath = toFilePath(Paths.cache.uri).replace(/\/$/, "");
      const outputPath = `${cachePath}/convert_merged_${Date.now()}.mov`;

      const result = await MediaToolkit.concatVideos(clipPaths, outputPath);
      const outputUri = `file://${outputPath}`;

      setStatusText(
        t("videoMerge.success", {
          duration: formatTime(Math.floor(result.durationSec)),
        }),
      );

      await Sharing.shareAsync(outputUri, {
        mimeType: "video/quicktime",
        dialogTitle: t("videoMerge.share"),
      });
    } catch (error) {
      console.error("Video birleştirme hatası:", error);

      setStatusText(t("videoMerge.failed"));

      Alert.alert(
        t("videoMerge.errorTitle"),
        error instanceof Error ? error.message : t("videoMerge.pickError"),
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
          <Text style={styles.accordionIcon}>🎞️</Text>

          <View>
            <Text style={styles.accordionTitle}>{t("videoMerge.title")}</Text>

            <Text style={styles.accordionSub}>{t("videoMerge.subtitle")}</Text>
          </View>
        </View>

        <Text style={styles.chevron}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.accordionBody}>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={pickMergeVideos}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {t("videoMerge.addVideo")}
            </Text>
          </TouchableOpacity>

          {mergeVideos.length > 0 && (
            <>
              <Text style={styles.fileInfoText}>
                {t("videoMerge.selectedCount", {
                  count: mergeVideos.length,
                })}
              </Text>

              {mergeVideos.map((video, index) => (
                <View key={`${video.uri}-${index}`} style={styles.mergeItem}>
                  <View style={styles.mergeItemInfo}>
                    <Text style={styles.mergeItemTitle} numberOfLines={1}>
                      {index + 1}. {video.name}
                    </Text>

                    <Text style={styles.fileInfoText}>
                      {formatFileSize(video.size ?? null)}
                    </Text>
                  </View>

                  <View style={styles.mergeControls}>
                    <TouchableOpacity
                      style={styles.moveButton}
                      onPress={() => moveMergeVideo(index, -1)}
                      disabled={index === 0 || isLoading}
                    >
                      <Text style={styles.moveButtonText}>↑</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.moveButton}
                      onPress={() => moveMergeVideo(index, 1)}
                      disabled={index === mergeVideos.length - 1 || isLoading}
                    >
                      <Text style={styles.moveButtonText}>↓</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeVideoButton}
                      onPress={() => removeMergeVideo(index)}
                      disabled={isLoading}
                    >
                      <Text style={styles.removeVideoText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.mergeButton, isLoading && styles.disabledButton]}
                onPress={mergeSelectedVideos}
                disabled={isLoading || mergeVideos.length < 2}
              >
                <Text style={styles.actionButtonText}>
                  {isLoading
                    ? t("videoMerge.converting")
                    : t("videoMerge.merge")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => setMergeVideos([])}
                disabled={isLoading}
              >
                <Text style={styles.resetButtonText}>
                  {t("videoMerge.clear")}
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
  mergeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2C2C2E",
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  mergeItemInfo: { flex: 1, gap: 4 },
  mergeItemTitle: { color: "#fff", fontSize: 13, fontWeight: "600" },
  mergeControls: { flexDirection: "row", alignItems: "center", gap: 5 },
  moveButton: {
    backgroundColor: "#3A3A3C",
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  moveButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  removeVideoButton: {
    backgroundColor: "#8E2929",
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  removeVideoText: { color: "#fff", fontSize: 20 },
  mergeButton: {
    backgroundColor: "#5856D6",
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
