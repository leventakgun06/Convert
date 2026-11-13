import { Paths } from "expo-file-system";

export const formatFileSize = (bytes: number | null) => {
  if (bytes === null || !Number.isFinite(bytes)) {
    return "Bilinmiyor";
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const toFilePath = (uri: string) => {
  const path = uri.startsWith("file://") ? uri.slice(7) : uri;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

export const createOutputPath = (prefix: string, extension: string) => {
  const cachePath = toFilePath(Paths.cache.uri).replace(/\/$/, "");
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${cachePath}/convert_${prefix}_${uniqueId}.${extension}`;
};