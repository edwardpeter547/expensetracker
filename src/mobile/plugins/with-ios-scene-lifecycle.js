/**
 * Local Expo config plugin: adopt the iOS scene lifecycle.
 *
 * iOS 26/27 asserts at launch unless an app declares `UIApplicationSceneManifest`
 * and uses a `UIWindowSceneDelegate`. Expo SDK 57's bundled prebuild template
 * still generates the legacy AppDelegate, so this plugin writes the scene
 * manifest into Info.plist and replaces AppDelegate.swift with the scene-based
 * variant on every prebuild.
 */

const { withDangerousMod, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/** Objective-C name of Expo's scene delegate (set with `@objc`). */
const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';

const APP_DELEGATE_TEMPLATE = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`;

/**
 * Add the scene manifest to the generated Info.plist.
 *
 * @param {import('@expo/config-plugins').ExportedConfig} config Expo config.
 * @returns {import('@expo/config-plugins').ExportedConfig} The updated config.
 */
function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
            UISceneStoryboardFile: 'SplashScreen',
          },
        ],
      },
    };
    return cfg;
  });

  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      if (cfg.modRequest.introspect) return cfg;

      const projectName = cfg.modRequest.projectName || cfg.name;
      const appDelegatePath = path.join(
        cfg.modRequest.platformProjectRoot,
        projectName,
        'AppDelegate.swift',
      );

      if (fs.existsSync(path.dirname(appDelegatePath))) {
        fs.writeFileSync(appDelegatePath, APP_DELEGATE_TEMPLATE, 'utf8');
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withIosSceneLifecycle;
