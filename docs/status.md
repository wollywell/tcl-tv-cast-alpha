# TCL TV Cast Status

## Current Phase

MVP source implementation complete; local Node validation passed.

## Decisions

- Target platform: TCL Google TV / Android TV.
- Transport: Wi-Fi local network.
- Media path: WebRTC.
- Mac app shell: Electron starts the sender server and opens a desktop window.
- Electron shell configures screen capture for the WebRTC sender UI.
- Electron shell falls back to a free local port if the preferred port is busy.
- Mac app can be packaged locally with Electron Builder via `npm run package:mac`.
- Packaged macOS dir build is available at `outputs/desktop/mac-arm64/TCL TV Cast.app` after `npm run package:mac`.
- Packaged macOS zip distribution is available at `outputs/desktop/TCL TV Cast-0.1.0-arm64-mac.zip` after `npm run package:mac:zip`.
- Packaged macOS DMG distribution is available at `outputs/desktop/TCL TV Cast-0.1.0-arm64.dmg` after `npm run package:mac:dmg`.
- Packaged macOS artifacts include the prebuilt receiver APK at `Contents/Resources/receiver/app-debug.apk`.
- Standalone receiver APK is available at `outputs/tcl-tv-cast-receiver-debug.apk`.
- First-install path: ADB from Mac.
- Fallback install path: direct local APK download at short TV URL `http://<MAC_WIFI_IP>:4173/apk`.
- Mac UI shows the current short and full TV APK URLs for the selected Mac Wi-Fi IP.
- Wireless debugging pairing can be done from the Mac UI.
- Install readiness for ADB and receiver APK is shown in the Mac UI.
- Android SDK and platform-tools visibility are shown in the Mac UI.
- Pair/install commands automatically use SDK `platform-tools/adb` if PATH `adb` is unavailable.
- Pair/install commands automatically use project-local `.tools/platform-tools/adb` if PATH and SDK ADB are unavailable.
- Mac UI can install Android Platform Tools into `.tools/platform-tools` for local ADB without editing shell PATH.
- Mac UI can install Android SDK command-line tools and receiver build packages into `.tools/android-sdk`.
- Receiver Gradle build uses detected Android SDK paths, including project-local `.tools/android-sdk`.
- Receiver Gradle build only selects SDK paths that have the required Android 35 platform and build tools.
- Mac UI asks for Android SDK License confirmation before downloading ADB or SDK packages.
- Already installed receiver apps can be relaunched without reinstalling the APK.
- Android TV receiver persists the last Mac sender URL for launcher reuse.
- Android TV receiver can accept a manually entered Mac receiver URL after sideload install.
- Android TV receiver appends manufacturer/model to the receiver registration URL when available.
- Android TV receiver keeps the screen awake and uses immersive fullscreen while open.
- Stop sharing clears the TV receiver video and returns it to waiting mode.
- Replacement WebRTC offers clear stale receiver video tracks before connecting again.
- TV receiver shows clearer WebRTC connection and failure states.
- Android TV receiver includes network security config for local HTTP sender URLs.
- `npm run doctor` prints setup readiness before using the UI.
- Mac sender provides remembered stream quality controls for resolution and frame rate.
- Mac sender has optional persisted audio capture for supported screen sources.
- Mac sender displays approximate outbound WebRTC video bitrate during sharing.
- Mac UI persists last-used TV target, Mac host, and pairing target.
- Connected ADB devices can be listed and selected in the Mac UI after pairing.
- Successful Wireless debugging pairing automatically refreshes the connected ADB devices list.
- If exactly one connected ADB device is ready, the Mac UI selects it automatically.
- Receiver APK can be built from the Mac UI using the project-local Gradle wrapper.
- Receiver APK has been built locally with `npm run build:receiver`.
- Install-and-launch automatically builds the receiver APK first when the APK is missing.
- Install-and-launch runs setup preflight and can offer to install missing ADB tools or Android SDK build packages before continuing.
- Wi-Fi discovery combines Google Cast mDNS and wireless ADB candidates.
- mDNS-only candidates no longer prefill the pairing target with the Google Cast port.
- Bluetooth is out of scope for video streaming because bandwidth and reliability are not suitable for screen mirroring.

## Assumptions

- Mac and TV are on the same Wi-Fi network.
- User can enable Developer options and ADB debugging / Wireless debugging on the TCL TV.
- macOS screen recording permission will be granted by the user when the browser asks for screen capture.

## Verified

- `npm test`: 81 tests passed after adding Electron desktop embedding, packaging metadata, Wi-Fi ADB discovery, Google Cast mDNS discovery, ADB devices selection, post-pair ADB refresh, single-device auto-selection, wireless debugging pairing, setup readiness, CLI setup doctor, SDK/platform-tools/project-local ADB fallback, project-local Android SDK bootstrap, build-ready SDK selection, install preflight for missing local tools, explicit wireless debugging port handling, launch-only receiver flow, receiver URL persistence, manual TV receiver URL entry, Android TV device naming, TV keep-awake immersive mode, local HTTP network security config, explicit WebRTC stop signaling, replacement-offer cleanup, TV connection status messages, Mac UI setup persistence, stream quality controls, optional audio capture, outbound bitrate stats, wrapper build command coverage, automatic receiver APK build-before-install checks, local Platform Tools install coverage, direct receiver APK download coverage, short TV APK URL coverage, Electron port fallback coverage, packaged Mac app metadata coverage, packaged embedded APK path coverage, and writable packaged tools path coverage.
- `npm run package:mac`: created `outputs/desktop/mac-arm64/TCL TV Cast.app`.
- Packaged app smoke launch: executable started on `PORT=4899` and stayed running until manually stopped; only a Node `DEP0180` warning was emitted.
- `npm run package:mac:zip`: created `outputs/desktop/TCL TV Cast-0.1.0-arm64-mac.zip`.
- Zip distribution smoke launch: unpacked app started on `PORT=4901` and stayed running until manually stopped; only a Node `DEP0180` warning was emitted.
- `npm run package:mac:dmg`: created `outputs/desktop/TCL TV Cast-0.1.0-arm64.dmg`.
- DMG verification: `hdiutil imageinfo` succeeded, `hdiutil attach -readonly` mounted the image, `TCL TV Cast.app` was present inside, and the image detached cleanly.
- `npm run install:android-sdk -- --accept-android-sdk-license`: installed local Android command-line tools and packages into `.tools/android-sdk`.
- `npm run build:receiver`: built `apps/android-tv-receiver/app/build/outputs/apk/debug/app-debug.apk`.
- Receiver APK SHA-256: `73c59121d9dcf98f9a9abb30c9bf7ecb0dfeefbfbfa5864077d8233411c00aa7`.
- `aapt dump badging` verified package `com.tclcast.receiver`, minSdk 26, targetSdk 35, compileSdk 35, `android.permission.INTERNET`, and leanback launchable `com.tclcast.receiver.MainActivity`.
- Packaged app setup-status smoke verified `apkExists: true` with unpacked APK path under `TCL TV Cast.app/Contents/Resources/receiver/app-debug.apk`.
- Packaged app setup-status smoke verified packaged writable tools paths under `~/Library/Application Support/TCL TV Cast/tools`.
- Packaged app `/api/status` smoke verified `apkUrl` and `shortApkUrl` use the active server port.
- Packaged app `/apk` smoke returned HTTP 200 with `tcl-tv-cast-receiver-debug.apk` and matching SHA-256.
- Packaged app embedded APK, standalone APK, Gradle APK, and `/apk` download all matched SHA-256 `73c59121d9dcf98f9a9abb30c9bf7ecb0dfeefbfbfa5864077d8233411c00aa7`.
- Packaged app port-fallback smoke verified that when `4173` is busy, the app starts on a free port, reports that active port in `/api/status`, and serves `/apk` with matching SHA-256.
- Zip and DMG artifacts both contain `TCL TV Cast.app/Contents/Resources/receiver/app-debug.apk` with matching SHA-256.
- `npm run dev`: sender server starts at `http://192.168.0.7:4173`.
- Browser verification:
  - `http://localhost:4173` renders the Mac sender UI.
  - `http://localhost:4173/tv?name=TCL%20Google%20TV%20Smoke` renders the Android TV receiver page and connects to signaling.

## Not Verified Locally

- ADB install to a physical TCL / Android TV was not run because no physical TV target is configured in this environment.
- Packaged app is not code-signed because this machine has no valid Apple Developer ID Application certificate.

## Next

- If ADB is missing, click **Install ADB tools** in the Mac UI or run `npm run install:adb -- --accept-android-sdk-license`.
- Install the APK on a TCL Google TV / Android TV through the Mac sender install panel.
- If ADB is inconvenient, sideload the receiver from `http://<MAC_WIFI_IP>:4173/apk` while the Mac app is running.
- Run the physical-device WebRTC smoke test.
- Code-sign/notarize the packaged Mac app for distribution outside local development.

## Audit Log

- 2026-06-10: Design approved for Wi-Fi MVP targeting TCL Google TV / Android TV.
- 2026-06-10: Implemented Mac sender, Android TV WebView receiver, tests, and docs.
- 2026-06-10: Added Wi-Fi scan for Android TV ADB candidates so setup can start from a device list instead of only manual IP entry.
- 2026-06-10: Added `adb pair` support to the Mac UI for Android TV / Google TV Wireless debugging setup.
- 2026-06-10: Added install readiness status for ADB and receiver APK before the user attempts installation.
- 2026-06-10: Added project-local Gradle wrapper and Mac UI build button for the receiver APK.
- 2026-06-10: Added Android SDK and platform-tools detection to the setup readiness panel.
- 2026-06-10: Added Google Cast mDNS discovery and merged it with ADB candidates in the TV scan list.
- 2026-06-10: Added Electron desktop shell so the Mac sender can run as an app window via `npm run app`.
- 2026-06-10: Added Electron display media handler so the desktop shell can provide screen/window capture to WebRTC.
- 2026-06-10: Added automatic ADB path selection so install/pair can use SDK `platform-tools/adb` without PATH setup.
- 2026-06-10: Corrected TV candidate selection so Google Cast ports are not treated as ADB pairing ports.
- 2026-06-10: Added launch-only flow for already installed TV receivers.
- 2026-06-11: Added Electron Builder packaging metadata and `npm run package:mac`.
- 2026-06-11: Added Android TV receiver persistence for the last Mac sender URL.
- 2026-06-11: Added manual Mac receiver URL entry for sideloaded TV installs.
- 2026-06-11: Added Mac UI persistence for last-used setup fields.
- 2026-06-11: Added connected ADB devices listing and selection for paired TVs.
- 2026-06-11: Added Android TV manufacturer/model naming for receiver registration.
- 2026-06-11: Added Android TV keep-screen-on and immersive fullscreen behavior.
- 2026-06-11: Added explicit WebRTC stop signaling so the TV receiver clears stale video.
- 2026-06-11: Added remembered stream quality controls for resolution and frame rate.
- 2026-06-11: Added receiver cleanup before replacement WebRTC offers.
- 2026-06-11: Added clearer TV receiver WebRTC connection status and failure messages.
- 2026-06-11: Added outbound WebRTC bitrate stats display on the Mac sender.
- 2026-06-11: Added automatic ADB devices refresh after successful wireless debugging pairing.
- 2026-06-11: Added Android network security config for local HTTP sender URLs.
- 2026-06-11: Added auto-selection for a single ready connected ADB device.
- 2026-06-11: Added `npm run doctor` CLI for setup readiness diagnostics.
- 2026-06-11: Added optional persisted audio capture toggle to the Mac sender.
- 2026-06-11: Added automatic receiver APK build before install when the APK is missing.
- 2026-06-11: Added project-local Android Platform Tools install flow and ADB fallback path.
- 2026-06-11: Added project-local Android SDK bootstrap for command-line tools, Android 35 platform, and build tools.
- 2026-06-11: Added build-ready SDK selection and UI license confirmation before ADB/SDK downloads.
- 2026-06-11: Added install preflight so Install and launch can offer missing ADB/SDK setup before continuing.
- 2026-06-11: Built and smoke-launched packaged macOS app bundle with Electron Builder.
- 2026-06-11: Added and smoke-tested packaged macOS zip distribution.
- 2026-06-11: Added and verified packaged macOS DMG distribution.
- 2026-06-11: Installed local Android SDK packages, built receiver APK, verified APK metadata, and embedded the APK unpacked in packaged Mac artifacts.
- 2026-06-11: Added direct local APK download at `/receiver.apk` for TV-side sideloading fallback.
- 2026-06-11: Added visible TV APK URL in the Mac UI and `/api/status` for easier sideloading from TCL TV.
- 2026-06-11: Added short `/apk` download alias for easier TV remote entry.
- 2026-06-11: Added Electron fallback to a free local port when the preferred port is busy.
