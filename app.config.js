module.exports = () => ({
  expo: {
    name: 'mobile-project',
    slug: 'mobile-project',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'mobileproject',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/expo.icon',
    },
    android: {
      package: 'com.knust.classmate',
      // EAS Build injects a real file path via the GOOGLE_SERVICES_JSON secret
      // file env var; local dev falls back to the file at the project root.
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          android: {
            image: './assets/images/splash-icon.png',
            imageWidth: 76,
          },
        },
      ],
      'expo-secure-store',
      'expo-notifications',
      'expo-sharing',
      'expo-dev-client',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '7513c8ee-89dc-4da6-9eed-5887a22e51ce',
      },
    },
    owner: 'pa-alieu25s-team',
  },
});
