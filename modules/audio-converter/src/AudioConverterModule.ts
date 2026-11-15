import { NativeModule, requireNativeModule } from "expo";

declare class AudioConverterNativeModule extends NativeModule<{}> {
  convertMp3ToM4a(inputUri: string): Promise<string>;
}

export default requireNativeModule<AudioConverterNativeModule>(
  "AudioConverter"
);