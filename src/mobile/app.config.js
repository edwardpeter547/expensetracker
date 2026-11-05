const API_URL = process.env.EXPO_PUBLIC_API_URL;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '7001';
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';
const AUDITWALLET_PLANS_URL = process.env.EXPO_PUBLIC_AUDITWALLET_PLANS_URL || '';

const normalizedApiUrl = (() => {
    if (!API_URL) return undefined;
    return API_URL.replace(/\/+$/, '');
})();

export default {
  "expo": {
    "name": "expense-tracker",
    "slug": "mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "mobile",
    "userInterfaceStyle": "automatic",
    "ios": {
      "icon": "./assets/images/icon.png",
      "bundleIdentifier": "com.axorek.expensetracker"
    },
    "android": {
      "package": "com.axorek.expensetracker",
      "adaptiveIcon": {
        "backgroundColor": "#0D1B2E",
        "foregroundImage": "./assets/images/android-icon-foreground.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      "./plugins/with-ios-scene-lifecycle",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#FFFFFF",
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 96,
          "resizeMode": "contain"
        }
      ],
      [
        "expo-secure-store",
        {
          "faceIDPermission": "Allow ExpenseTracker to use Face ID to protect your stored sign-in information."
        }
      ],
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow ExpenseTracker to use Face ID to securely unlock your account and protect your financial information."
        }
      ],
      // ✅ Added for SDK 57
      "expo-font",
      "expo-image",
      "expo-status-bar",
      "expo-web-browser",
      "expo-localization"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "eas": {
        "projectId": "be526f99-7f66-43ed-8711-cf0312476fa9"
      },
      apiUrl: normalizedApiUrl,
      apiPort: Number.parseInt(API_PORT, 10) || 7001,
      environment: APP_ENV,
      auditWalletPlansUrl: AUDITWALLET_PLANS_URL.trim() || undefined
    },
    "owner": "edwardpeter547"
  }
}
