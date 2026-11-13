import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const { width, height } = Dimensions.get("window");

interface CustomSplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: CustomSplashScreenProps) {
  const { t } = useTranslation();

  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 800 });
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    translateY.value = withTiming(0, { duration: 800 });

    const timer = setTimeout(() => {
      screenOpacity.value = withTiming(0, { duration: 600 }, (finished) => {
        if (finished) {
          scheduleOnRN(onFinish);
        }
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish, opacity, scale, screenOpacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.contentBox, animatedStyle]}>
        <View style={styles.logoRing}>
          <View style={styles.logoInner}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
        </View>

        <Text style={styles.title}>CONVERT</Text>

        <Text style={styles.subtitle}>{t("splash.subtitle")}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.loadingBar}>
          <View style={styles.loadingProgress} />
        </View>

        <Text style={styles.footerText}>{t("splash.loading")}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
  },
  contentBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 149, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 149, 0, 0.4)",
  },
  logoInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FF9500",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF9500",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
    gap: 10,
  },
  loadingBar: {
    width: 120,
    height: 4,
    backgroundColor: "#2A2A2A",
    borderRadius: 2,
    overflow: "hidden",
  },
  loadingProgress: {
    width: "60%",
    height: "100%",
    backgroundColor: "#FF9500",
    borderRadius: 2,
  },
  footerText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
