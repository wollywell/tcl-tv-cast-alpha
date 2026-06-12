# TCL TV Cast MVP Design

## Goal

Build an open source MVP that lets a MacBook stream its screen to a nearby TCL Google TV / Android TV on the same Wi-Fi network.

## Product Shape

- The Mac runs an Electron sender app that starts the local server and opens the UI in a desktop window.
- The user installs a small Android TV receiver APK on the TCL TV through an ADB-based setup flow.
- The Mac install flow can build the receiver APK through the project Gradle wrapper when the APK is missing.
- The TV receiver connects back to the Mac sender over Wi-Fi.
- The Mac UI lists discovered and connected TVs, lets the user choose one, asks macOS for screen sharing permission, and starts a WebRTC stream.

## Architecture

- `apps/mac-desktop`: Electron shell that starts the sender server, opens the Mac UI, and wires desktop screen capture into `getDisplayMedia`.
- `apps/mac-sender`: Node.js server, browser UI, Socket.IO signaling, ADB installer endpoints.
- `apps/android-tv-receiver`: Android TV app with a WebView shell and project-local Gradle wrapper. It opens the Mac-hosted receiver page passed through an intent extra.
- The Android TV receiver keeps the display awake and enters immersive fullscreen while receiving.
- Electron Builder packages the Mac shell into `outputs/desktop/mac-arm64/TCL TV Cast.app` for local distribution.
- Electron Builder can also package a transferable zip at `outputs/desktop/TCL TV Cast-0.1.0-arm64-mac.zip`.
- Electron Builder can also package a DMG installer image at `outputs/desktop/TCL TV Cast-0.1.0-arm64.dmg`.
- Packaged Mac artifacts include the prebuilt Android TV receiver APK as an unpacked resource at `Contents/Resources/receiver/app-debug.apk` so `adb install` can read it as a normal file.
- WebRTC carries the screen video directly between the sender browser and the TV WebView.
- Electron uses the system screen picker when available, with a `desktopCapturer` fallback.
- Socket.IO is used only for signaling and device registration.
- mDNS Google Cast discovery is used as a pre-install hint for nearby Android TV / Google TV devices.
- ADB is used for the first install and for launching the receiver with the current Mac server URL.
- If ADB is not installed, the Mac UI can download Android Platform Tools for macOS into project-local `.tools/platform-tools`.
- If Android SDK build packages are not installed, the Mac UI can download Android command-line tools and install required packages into project-local `.tools/android-sdk`.
- The Mac UI asks for Android SDK License confirmation before downloading ADB or SDK packages.

## Connection Flow

1. Mac sender starts on port `4173` from Electron or browser dev mode.
2. The Mac UI detects local Wi-Fi IP addresses and shows an install panel.
3. The Mac UI checks whether `adb` is available, whether Android SDK/platform-tools are visible, whether project-local `.tools/platform-tools/adb` exists, which `adb` path will be used, and whether the receiver APK exists.
4. If ADB is missing, user can click **Install ADB tools** to download Android Platform Tools for macOS into `.tools/platform-tools`.
5. If Android SDK packages are missing, user can click **Install Android SDK**, confirm the Android SDK License prompt, then download command-line tools and install `platform-tools`, `platforms;android-35`, and `build-tools;35.0.0`.
6. If the APK is missing, the install flow runs `./gradlew :app:assembleDebug` before ADB install. The user can also trigger this explicitly with the build button.
7. User scans the local Wi-Fi network for Google Cast/mDNS and Android TV ADB candidates, selects one, or enters the TCL TV ADB install target manually as `IP` or `IP:ADB_PORT`.
8. If the TV requires Wireless debugging pairing, user enters the pairing `IP:port` and code shown by the TV in the Mac UI.
9. User can list connected `adb devices` and select the paired target.
10. User clicks install.
11. The install flow checks setup readiness and offers to install missing ADB tools or Android SDK build packages before continuing.
12. Mac runs `adb connect`, installs the receiver APK, then launches it with `serverUrl=http://MAC_IP:4173/tv`.
10. TV WebView opens `/tv`, registers itself as a receiver, and appears in the Mac UI.
11. On later sessions, user can click launch-only to run `adb connect` and `adb shell am start` without reinstalling the APK.
12. The TV app saves the last `serverUrl`, so opening it from the TV launcher can reconnect to the last used sender.
13. The TV app appends its Android manufacturer/model as the receiver `name` query parameter when available.
14. The Mac UI saves the last TV target, Mac host selection, and pairing target locally for repeat sessions.
15. User selects the TV and starts screen sharing.
16. Browser `getDisplayMedia` captures the Mac screen and WebRTC streams it to the TV.

## Error Handling

- Missing ADB returns an actionable message.
- Missing APK triggers an automatic build before install; Gradle/SDK failures are shown in the install log.
- Setup readiness is shown before install, including ADB availability, Android SDK/platform-tools visibility, selected ADB path, and the expected APK path.
- If PATH lacks `adb` but SDK `platform-tools/adb` or project-local `.tools/platform-tools/adb` exists, pair/install commands use that copy automatically.
- APK build errors from Gradle/Android SDK are shown in the install log.
- Offline TV or failed ADB connection is reported in the install log.
- Repeat launch failures are reported in the same install log.
- Connected ADB devices can be listed and selected after pairing.
- If the receiver is launched without an ADB extra, it reuses the last saved Mac sender URL when available.
- The receiver adds the Android TV manufacturer/model to its registration URL so the Mac list is easier to read.
- The receiver uses keep-screen-on and immersive flags so the TV does not dim or show navigation during casting.
- Stop sharing sends an explicit signal to the TV receiver so it clears the video stream and returns to waiting mode.
- Mac sender stream quality controls choose 720p/1080p and 30/60 fps constraints before `getDisplayMedia`.
- Mac sender samples WebRTC outbound video stats and displays approximate bitrate while sharing.
- The Mac UI persists last-used setup fields in local storage so repeat launches need less typing.
- Receiver disconnects remove the TV from the list.
- WebRTC connection failures are surfaced in both sender and receiver UI.
- Wi-Fi scanning uses short TCP probes against local `/24` hosts on ADB port `5555`; manual entry remains available for TVs using random wireless debugging ports.
- Wi-Fi scanning also uses Google Cast mDNS to surface likely TVs before ADB is enabled.
- Google Cast ports are not reused as ADB pairing ports; the UI leaves pairing target blank for mDNS-only candidates.
- Wireless debugging pairing is exposed in the Mac UI through `adb pair`.

## Testing

- Unit tests cover local IP selection, ADB command construction/error mapping, wireless debugging pairing command construction, local ADB candidate discovery helpers, and mDNS candidate normalization.
- Unit tests cover setup readiness fields for ADB and APK presence.
- Unit tests cover Android SDK and platform-tools detection.
- Unit tests cover project-local Platform Tools detection and install UI wiring.
- Unit tests cover project-local Android SDK detection, install UI wiring, required packages, and Gradle build environment.
- Unit tests cover skipping incomplete SDK directories for receiver builds.
- Unit tests cover install preflight wiring before receiver install.
- Unit tests cover Android receiver build command planning.
- Unit tests cover automatic build-before-install behavior for existing and missing APK cases.
- Manual smoke test covers sender server startup, TV receiver page load, receiver registration, and WebRTC flow in two browser tabs.
- Android APK build is validated with local Android SDK/Gradle and APK metadata inspection.
