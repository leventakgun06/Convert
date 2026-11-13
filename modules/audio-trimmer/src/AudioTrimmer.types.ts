// Define your exported module types here.

export type AudioTrimResult = {
  uri: string;
  size: number;
  duration: number;
};

export type AudioTrimmerModuleType = {
  trimAudio(
    uri: string,
    startTimeMs: number,
    endTimeMs: number
  ): Promise<AudioTrimResult>;
};
