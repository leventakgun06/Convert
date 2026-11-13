
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MediaToolkit } from "react-native-media-toolkit";
import MediaConverter from "../../modules/media-converter/src/MediaConverterModule";
import {
  createOutputPath,
  formatFileSize,
  formatTime,
} from "../utils/media-helpers";

type CompressionQuality = "low" | "medium" | "high";

interface VideoEditorSectionProps {
  videoUri: string;
  videoSize: number | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setStatusText: (text: string) => void;
  onReset: () => void;
}

export default function VideoEditorSection({
  videoUri,
  videoSize,
  isLoading,
  setIsLoading,
  setStatusText,
  onReset,
}: VideoEditorSectionProps) {
  const { t } = useTranslation();

  const [duration, setDuration] = useState<number>(100);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(100);
  const [selectedArtworkUri, setSelectedArtworkUri] = useState<string | null>(
    null,
  );
  const [extractedAudioSize, setExtractedAudioSize] = useState<number | null>(
    null,
  );
  const [compressedFileSize, setCompressedFileSize] = useState<number | null>(
    null,
  );
  const [compressionQuality, setCompressionQuality] =
    useState<CompressionQuality>("medium");

  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = true;
    if (player.duration && player.duration > 0) {
      const totalSecs = Math.floor(player.duration);
      setDuration(totalSecs);
      setEndTime(totalSecs);
    }
  });

  const handleStartTimeChange = (val: number) => {
    const newStart = Math.floor(val);
    if (newStart >= endTime) {
      setStartTime(endTime - 1 > 0 ? endTime - 1 : 0);
    } else {
      setStartTime(newStart);
      if (player) {
        player.currentTime = newStart;
      }
    }
  };

  const handleEndTimeChange = (val: number) => {
    const newEnd = Math.floor(val);
    if (newEnd <= startTime) {
      setEndTime(startTime + 1 <= duration ? startTime + 1 : duration);
    } else {
      setEndTime(newEnd);
    }
  };

  const handleReset = () => {
    player.pause();
    onReset();
  };

  // Video Kesme
  const trimVideo = async () => {
    try {
      setIsLoading(true);
      setStatusText(t("videoEditor.trimLoading"));

      const result = await MediaToolkit.trimVideo(videoUri, {
        startTime: Math.round(startTime * 1000),
        endTime: Math.round(endTime * 1000),
        outputPath: createOutputPath("trim", "mp4"),
      });

      setStatusText(t("videoEditor.trimSuccess"));

      await Sharing.shareAsync(result.uri, {
        mimeType: "video/mp4",
        dialogTitle: t("videoEditor.trimShare"),
      });
    } catch (error) {
      console.error("Video kesme hatası:", error);
      Alert.alert(
        t("common.error"),
        t("videoEditor.trimError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Albüm Kapağı Seçme
  const pickAlbumArtwork = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedArtworkUri(result.assets[0].uri);
        setStatusText(t("videoEditor.artworkSelected"));
      }
    } catch (error) {
      console.error("Kapak görseli seçme hatası:", error);
      Alert.alert(
        t("common.error"),
        t("videoEditor.artworkError"),
      );
    }
  };

  // M4A Ses Ayıklama
  const convertToM4A = async () => {
    try {
      setIsLoading(true);
      setExtractedAudioSize(null);
      setStatusText(t("videoEditor.extractLoading"));

      const result = await MediaToolkit.extractAudio(videoUri, {
        outputPath: createOutputPath("audio", "m4a"),
      });

      let finalAudioUri = result.uri;

      if (selectedArtworkUri) {
        setStatusText(t("videoEditor.artworkAdding"));

        finalAudioUri = await MediaConverter.addAlbumArtwork(
          result.uri,
          selectedArtworkUri,
        );
      }

      setExtractedAudioSize(result.size);

      setStatusText(
        selectedArtworkUri
          ? t("videoEditor.extractArtworkSuccess", {
              size: formatFileSize(result.size),
            })
          : t("videoEditor.extractSuccess", {
              size: formatFileSize(result.size),
            }),
      );

      setIsLoading(false);

      await Sharing.shareAsync(finalAudioUri, {
        mimeType: "audio/m4a",
        dialogTitle: t("videoEditor.extractShare"),
      });

      handleReset();
    } catch (error) {
      console.error("Ses çıkarma hatası:", error);
      setStatusText(t("videoEditor.extractFailed"));

      Alert.alert(
        t("common.error"),
        error instanceof Error
          ? error.message
          : t("videoEditor.extractError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Video Sıkıştırma
  const compressVideo = async () => {
    try {
      setIsLoading(true);
      setStatusText(t("videoEditor.compressLoading"));
      setCompressedFileSize(null);

      const result = await MediaToolkit.compressVideo(videoUri, {
        quality: compressionQuality,
        outputPath: createOutputPath("compress", "mp4"),
      });

      setCompressedFileSize(result.size);

      const savedBytes =
        videoSize !== null ? videoSize - result.size : null;

      if (savedBytes !== null && savedBytes > 0) {
        setStatusText(
          t("videoEditor.compressSaved", {
            size: formatFileSize(savedBytes),
          }),
        );
      } else if (savedBytes !== null && savedBytes < 0) {
        setStatusText(
          t("videoEditor.compressGrew", {
            size: formatFileSize(Math.abs(savedBytes)),
          }),
        );
      } else {
        setStatusText(t("videoEditor.compressSuccess"));
      }

      await Sharing.shareAsync(result.uri, {
        mimeType: "video/mp4",
        dialogTitle: t("videoEditor.compressShare"),
      });
    } catch (error) {
      console.error("Video sıkıştırma hatası:", error);
      setStatusText(t("videoEditor.compressFailed"));

      Alert.alert(
        t("common.error"),
        t("videoEditor.compressError"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <VideoView player={player} style={styles.video} nativeControls />
      </View>

      <View style={styles.actionContainer}>
        {/* Video Kesme */}
        <View style={styles.cardBox}>
          <Text style={styles.sectionTitle}>
            {t("videoEditor.trimTitle")}
          </Text>

          <Text style={styles.label}>
            {t("videoEditor.start")}: {formatTime(startTime)} ({startTime} sn)
          </Text>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration}
            step={1}
            value={startTime}
            onValueChange={handleStartTimeChange}
            minimumTrackTintColor="#FF9500"
            maximumTrackTintColor="#555"
            thumbTintColor="#FF9500"
          />

          <Text style={styles.label}>
            {t("videoEditor.end")}: {formatTime(endTime)} ({endTime} sn)
          </Text>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration}
            step={1}
            value={endTime}
            onValueChange={handleEndTimeChange}
            minimumTrackTintColor="#FF9500"
            maximumTrackTintColor="#555"
            thumbTintColor="#FF9500"
          />

          <TouchableOpacity
            style={[styles.actionButton, isLoading && styles.disabledButton]}
            onPress={trimVideo}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {t("videoEditor.trim")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* M4A Ses Ayıklama */}
        <View style={styles.cardBox}>
          <Text style={styles.sectionTitle}>
            {t("videoEditor.extractTitle")}
          </Text>

          <Text style={styles.label}>
            {t("videoEditor.artworkTitle")} {t("videoEditor.optional")}
          </Text>

          {selectedArtworkUri && (
            <Image
              source={{ uri: selectedArtworkUri }}
              style={styles.artworkPreview}
              resizeMode="cover"
            />
          )}

          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={pickAlbumArtwork}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>
                {selectedArtworkUri
                  ? t("videoEditor.changeArtwork")
                  : t("videoEditor.selectArtwork")}
              </Text>
            </TouchableOpacity>

            {selectedArtworkUri && (
              <TouchableOpacity
                style={styles.smallResetButton}
                onPress={() => setSelectedArtworkUri(null)}
                disabled={isLoading}
              >
                <Text style={styles.resetButtonText}>
                  {t("videoEditor.removeArtwork")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.audioButton, isLoading && styles.disabledButton]}
            onPress={convertToM4A}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {t("videoEditor.extract")}
            </Text>
          </TouchableOpacity>

          {extractedAudioSize !== null && (
            <Text style={styles.fileInfoText}>
              {t("videoEditor.extractSize")}:{" "}
              {formatFileSize(extractedAudioSize)}
            </Text>
          )}
        </View>

        {/* Video Sıkıştırma */}
        <View style={styles.cardBox}>
          <Text style={styles.sectionTitle}>
            {t("videoEditor.compressTitle")}
          </Text>

          <View style={styles.qualityContainer}>
            {(["low", "medium", "high"] as const).map((quality) => (
              <TouchableOpacity
                key={quality}
                style={[
                  styles.qualityButton,
                  compressionQuality === quality &&
                    styles.selectedQualityButton,
                ]}
                onPress={() => setCompressionQuality(quality)}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.qualityButtonText,
                    compressionQuality === quality &&
                      styles.selectedQualityText,
                  ]}
                >
                  {t(`videoEditor.${quality}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.fileInfo}>
            <Text style={styles.fileInfoText}>
              {t("videoEditor.originalSize")}: {formatFileSize(videoSize)}
            </Text>

            {compressedFileSize !== null && (
              <Text style={styles.fileInfoText}>
                {t("videoEditor.newSize")}:{" "}
                {formatFileSize(compressedFileSize)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.compressButton,
              isLoading && styles.disabledButton,
            ]}
            onPress={compressVideo}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {t("videoEditor.compress")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          disabled={isLoading}
        >
          <Text style={styles.resetButtonText}>
            {t("videoEditor.reset")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", marginBottom: 24 },
  videoContainer: {
    width: "100%",
    height: 210,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#000",
  },
  video: { width: "100%", height: "100%" },
  actionContainer: { width: "100%", gap: 12 },
  cardBox: {
    backgroundColor: "#1C1C1E",
    padding: 16,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  label: { color: "#ccc", fontSize: 13, marginBottom: 2 },
  slider: { width: "100%", height: 35 },
  actionButton: {
    backgroundColor: "#FF9500",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  audioButton: {
    backgroundColor: "#34C759",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButton: {
    backgroundColor: "#5856D6",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  rowButtons: { flexDirection: "row", gap: 8, alignItems: "center" },
  smallResetButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  qualityContainer: { flexDirection: "row", gap: 8 },
  qualityButton: {
    flex: 1,
    backgroundColor: "#2C2C2E",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  selectedQualityButton: { backgroundColor: "#007AFF" },
  qualityButtonText: { color: "#ccc", fontWeight: "600" },
  selectedQualityText: { color: "#fff" },
  fileInfo: { gap: 4, paddingVertical: 4 },
  fileInfoText: { color: "#aaa", fontSize: 13 },
  compressButton: {
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
  artworkPreview: {
    width: 130,
    height: 130,
    borderRadius: 12,
    alignSelf: "center",
    backgroundColor: "#2C2C2E",
  },
});
