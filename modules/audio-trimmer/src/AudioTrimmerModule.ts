
import { NativeModule, requireNativeModule } from "expo";
import type { AudioTrimResult } from "./AudioTrimmer.types";

declare class AudioTrimmerNativeModule extends NativeModule<{}> {
  trimAudio(
    uri: string,
    startTimeMs: number,
    endTimeMs: number
  ): Promise<AudioTrimResult>;
}

export default requireNativeModule<AudioTrimmerNativeModule>("AudioTrimmer");
