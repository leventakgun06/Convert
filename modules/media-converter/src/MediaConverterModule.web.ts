import { registerWebModule, NativeModule } from 'expo';

// MediaConverterModule is not available on the web platform.
class MediaConverterModule extends NativeModule<{}> {}

export default registerWebModule(MediaConverterModule, 'MediaConverterModule');
