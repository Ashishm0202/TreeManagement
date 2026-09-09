import type { ExpoConfig } from "expo/config";

const config = {
  name: "TreeManagement",
  slug: "TreeManagement",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "treemanagement",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.aondigicon.TreeManagement",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
    ],
    package: "com.aondigicon.TreeManagement",
    config: {
      googleMaps: {
        apiKey: "AIzaSyCj3ut6Pp8PTglH6Tx1KNPgZO1_tW5D614",
      },
    },
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#F3FAF4",
        dark: {
          backgroundColor: "#F3FAF4",
        },
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow Tree Management to use your location to tag a tree's exact position.",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Allow Tree Management to use your camera to scan a tree's QR code.",
      },
    ],
    "@react-native-community/datetimepicker"
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "38fdd3ff-b9da-4b58-b747-bfd81a3a194d"
    }
  },
} as ExpoConfig;

export default config;
