# TCL TV Cast Test Plan

## Automated

- `npm test` validates:
  - local IPv4 filtering avoids loopback/internal addresses;
  - install URL chooses a reachable local IP;
  - ADB command planning uses the expected package/activity and server URL;
  - ADB wireless debugging pairing command planning uses the expected target and code;
  - setup readiness reports ADB availability and expected APK presence;
  - setup doctor reports Android SDK and platform-tools visibility;
  - setup doctor selects PATH `adb` first and SDK `platform-tools/adb` as fallback;
  - setup doctor can use project-local `.tools/platform-tools/adb` when system ADB is missing;
  - setup doctor can use project-local `.tools/android-sdk` for receiver builds;
  - Gradle build environment skips SDK directories missing Android 35 platform/build tools;
  - Mac UI can trigger project-local Platform Tools install;
  - Mac UI can trigger project-local Android SDK install;
  - Mac UI runs setup preflight before receiver install and can offer missing tools;
  - Mac UI exposes a direct receiver APK download link;
  - Mac UI shows the current short and full TV APK URLs for manual sideloading;
  - Mac UI asks for Android SDK License confirmation before local tool downloads;
  - CLI setup doctor formats actionable readiness output;
  - ADB launch command starts an already installed receiver with the current server URL;
  - ADB devices output parses into selectable targets;
  - Mac UI can load connected ADB devices into the candidate list;
  - Mac UI refreshes connected ADB devices after successful pairing;
  - Mac UI auto-selects a single ready connected ADB target;
  - Android TV receiver persists the last sender URL for launcher reuse;
  - Android TV receiver can accept a manually entered Mac receiver URL after sideload install;
  - Android TV receiver appends manufacturer/model to the receiver URL;
  - Android TV receiver keeps the display awake and immersive while open;
  - Android TV receiver permits local HTTP sender URLs through network security config;
  - WebRTC stop signaling clears the TV video and returns receiver UI to waiting mode;
  - replacement WebRTC offers clear stale receiver media before reconnecting;
  - TV receiver shows connection and failure states during WebRTC negotiation;
  - Mac UI persists last-used setup fields for repeat sessions;
  - Mac UI applies persisted stream quality controls to `getDisplayMedia`;
  - Mac UI can request optional audio capture when supported;
  - Mac UI samples outbound WebRTC stats and formats video bitrate;
  - Android receiver build command uses the project-local Gradle wrapper;
  - package metadata embeds the built receiver APK as an unpacked Mac app resource;
  - install flow skips receiver rebuild when the APK exists and builds it when missing;
  - local `/24` ADB candidate discovery builds and probes host lists;
  - Google Cast mDNS services normalize into TV candidates;
  - mDNS and ADB candidates merge by host;
  - sender server can be embedded by the Electron desktop shell;
  - Electron main process parses with the display media handler configured;
  - Electron main process falls back to a free local port if the preferred port is busy;
  - package metadata contains Electron Builder output settings and `package:mac` script;
  - package metadata contains `package:mac:zip` for the transferable macOS app zip;
  - package metadata contains `package:mac:dmg` for the macOS installer image;
  - package metadata contains `open:mac` for opening the packaged app bundle;
  - `/tv` serves the Android TV receiver page;
  - `/apk` and `/receiver.apk` serve the Android TV receiver APK when available and return an actionable build error when missing;
  - `/api/status` reports sender, receiver, short APK, and full APK URLs using the active server port;
  - Socket.IO broadcasts receiver registrations to sender clients.

## Manual Smoke

1. Run `npm run app`, or run `npm run dev` for browser-only testing.
2. Open `http://localhost:4173`.
3. Confirm the install readiness line appears in the install panel.
4. Open `http://localhost:4173/tv` in a second browser tab to simulate the TV.
5. Confirm the simulated TV appears in the sender list.
6. Start sharing and select a screen/window.
7. Confirm video appears in the receiver tab.

## Device Smoke

1. Enable ADB debugging / Wireless debugging on TCL Google TV.
2. Pair wireless debugging from the Mac sender UI if the TV shows a pairing code.
3. Click **Show ADB devices** and select the paired TV target, or enter the TV ADB install target manually as `IP` or `IP:ADB_PORT`.
4. Click **Install and launch receiver** and confirm it offers to install missing ADB tools or Android SDK build packages when needed.
5. Confirm the app builds the missing APK automatically when needed.
6. Confirm `.tools/platform-tools/adb` and `.tools/android-sdk` become available if the preflight installed them.
7. Confirm the APK installs and launches on TV.
8. If ADB is inconvenient, open the **Short TV APK URL** shown in the Mac UI from a TV browser or Downloader app and confirm the APK can be sideloaded manually.
9. After manual sideloading, open **TCL TV Cast** on TV, enter the **TV Receiver URL** shown in the Mac UI, and confirm the TV appears in the sender list.
10. Relaunch the installed receiver with **Launch receiver only**.
11. Open the receiver from the TCL app launcher and confirm it reconnects to the last sender when the Mac server is reachable.
12. Start sharing from the Mac sender UI.
13. Confirm the TV shows the Mac screen.

## Known Gaps

- Android APK build requires Android SDK packages; the app can install them locally into `.tools/android-sdk`, and the current packaged Mac artifacts already include a built debug receiver APK.
- Automatic ADB tools install downloads official Android Platform Tools for macOS into a project-local `.tools` directory.
- macOS packaged app local dir build is not code-signed unless built with an Apple Developer ID certificate.
- macOS zip distribution is not code-signed/notarized unless built with an Apple Developer ID certificate and notarization credentials.
- macOS DMG distribution is not code-signed/notarized unless built with an Apple Developer ID certificate and notarization credentials.
- Discovery is best-effort: Google Cast mDNS can identify likely TVs, ADB scan can identify install-ready TVs, and receiver registration happens after install/launch.
