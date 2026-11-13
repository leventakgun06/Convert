
import { registerWebModule, NativeModule } from "expo";
import type { AudioTrimResult } from "./AudioTrimmer.types";

class AudioTrimmerModule extends NativeModule<{}> {
  async trimAudio(
    uri: string,
    startTimeMs: number,
    endTimeMs: number
  ): Promise<AudioTrimResult> {
    throw new Error("Ses kesme özelliği şu anda yalnızca iOS ve Android'de desteklenmektedir.");
  }
}

export default registerWebModule(AudioTrimmerModule, "AudioTrimmer");
