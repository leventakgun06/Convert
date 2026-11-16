
const {
  withAndroidStyles,
  withDangerousMod,
  withProjectBuildGradle,
  withGradleProperties,
} = require("@expo/config-plugins");

const fs = require("fs");
const path = require("path");

const withAndroidEmptySplash = (config) => {
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults.resources.style;
    const splashStyle = styles.find(
      (style) => style.$?.name === "Theme.App.SplashScreen"
    );

    if (!splashStyle) {
      throw new Error("Theme.App.SplashScreen bulunamadı.");
    }

    splashStyle.item = splashStyle.item || [];

    const iconItem = splashStyle.item.find(
      (item) => item.$?.name === "windowSplashScreenAnimatedIcon"
    );

    if (iconItem) {
      iconItem._ = "@drawable/splashscreen_empty";
    } else {
      splashStyle.item.push({
        $: { name: "windowSplashScreenAnimatedIcon" },
        _: "@drawable/splashscreen_empty",
      });
    }

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const drawableDir = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/res/drawable"
      );

      fs.mkdirSync(drawableDir, { recursive: true });

      fs.writeFileSync(
        path.join(drawableDir, "splashscreen_empty.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="@android:color/transparent"/>
</shape>`
      );

      return config;
    },
  ]);

  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const repository =
      '    maven { url("$rootDir/../modules/video-converter/android/maven-repo") }';

    if (!contents.includes("modules/video-converter/android/maven-repo")) {
      const pattern = /(allprojects\s*\{\s*repositories\s*\{)/;

      if (!pattern.test(contents)) {
        throw new Error("Gradle allprojects.repositories bloğu bulunamadı.");
      }

      contents = contents.replace(
        pattern,
        (match) => `${match}\n${repository}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  // Android 9 LogSessionId / R8 horizontal class merging düzeltmesi
  config = withGradleProperties(config, (config) => {
    const property =
      "systemProp.com.android.tools.r8.disableHorizontalClassMerging";

    const existing = config.modResults.find(
      (item) => item.type === "property" && item.key === property
    );

    if (existing) {
      existing.value = "true";
    } else {
      config.modResults.push({
        type: "property",
        key: property,
        value: "true",
      });
    }

    return config;
  });

  return config;
};

module.exports = withAndroidEmptySplash;
