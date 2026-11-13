
import { NativeModule, requireNativeModule } from "expo";

declare class MediaConverterModule extends NativeModule<{}> {
  convertVideoToMp4(inputUri: string): Promise<string>;

  addAlbumArtwork(
    audioUri: string,
    imageUri: string
  ): Promise<string>;
}

export default requireNativeModule<MediaConverterModule>("MediaConverter");
