import { requireNativeModule } from "expo-modules-core";

type VideoConverterModuleType = {
  convertMp4ToMov(inputUri: string): Promise<string>;
};

const VideoConverterModule =
  requireNativeModule<VideoConverterModuleType>("VideoConverter");

export async function convertMp4ToMov(
  inputUri: string
): Promise<string> {
  return VideoConverterModule.convertMp4ToMov(inputUri);
}
