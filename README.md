# TCL TV Cast

Alpha open-source prototype for streaming a MacBook screen to a TCL Google TV / Android TV over the same Wi-Fi network.

> Alpha status: the Mac app, Android TV receiver APK, packaging, local discovery, ADB install flow, manual APK sideload flow, and browser/WebRTC smoke paths are implemented and covered by automated checks. A real physical TCL / Android TV install and long-running screen-cast session still need field testing on more devices.

## Instructions

- Full Russian setup guide: [docs/INSTALL_FULL_RU.md](docs/INSTALL_FULL_RU.md)
- Short Russian setup guide: [docs/QUICKSTART_RU.md](docs/QUICKSTART_RU.md)
- Short Russian setup guide, profanity edition: [docs/QUICKSTART_RU_UNCENSORED.md](docs/QUICKSTART_RU_UNCENSORED.md)

## Alpha Scope

This project is meant for early testers who are comfortable with local-network setup, macOS screen-recording permissions, Android TV sideloading, and occasional rough edges. It is not code-signed, notarized, or production-hardened yet.

Known alpha limitations:

- Physical TCL / Android TV verification is still required.
- The macOS app is unsigned and may require manual approval in macOS security settings.
- The Android TV receiver is a debug APK intended for sideload testing.
- Bluetooth screen mirroring is intentionally out of scope; Wi-Fi/WebRTC is used instead.
- Audio capture depends on what macOS/Electron allows for the selected source.

## What It Builds

- Mac desktop sender: Electron app that opens the sender UI and starts the local server.
- Mac browser sender: local web app at `http://localhost:4173`.
- Android TV receiver: small APK that opens the Mac receiver page in a TV-friendly WebView.
- Transport: browser WebRTC video stream.
- Setup path: ADB install from Mac to TCL TV.
- Fallback setup path: direct APK download from the Mac sender at short TV URL `/apk`.

Bluetooth is intentionally not used for screen video. Wi-Fi gives the bandwidth and latency profile needed for screen mirroring.

## Run The Mac App

```bash
npm install
npm run doctor
npm run app
```

The desktop window starts the local sender server automatically.
When you start sharing, macOS/Electron will ask you to choose a screen or window and may require Screen Recording permission in System Settings.

If `npm run doctor` says ADB is missing, the Mac UI has an **Install ADB tools** button that asks for Android SDK License confirmation and downloads Android SDK Platform Tools for macOS into `.tools/platform-tools`. From Terminal, the same step is:

```bash
npm run install:adb -- --accept-android-sdk-license
```

If it says Android SDK or receiver build SDK is missing, use **Install Android SDK** in the Mac UI. It asks for Android SDK License confirmation before downloading. From Terminal, the same step is:

```bash
npm run install:android-sdk -- --accept-android-sdk-license
```

## Package The Mac App

```bash
npm run package:mac
npm run package:mac:zip
npm run package:mac:dmg
npm run open:mac
```

The packaged app is written to:

```text
outputs/desktop/
```

Packaging uses Electron Builder and may download the Electron runtime the first time it runs. The local dir build creates `outputs/desktop/mac-arm64/TCL TV Cast.app`. The zip build creates `outputs/desktop/TCL TV Cast-0.1.0-arm64-mac.zip`, which contains the `.app` bundle. The DMG build creates `outputs/desktop/TCL TV Cast-0.1.0-arm64.dmg` for a familiar Mac install flow. These artifacts are not code-signed unless you build on a Mac with a valid Apple Developer ID certificate.

The packaged Mac app includes a prebuilt Android TV receiver APK at:

```text
TCL TV Cast.app/Contents/Resources/receiver/app-debug.apk
```

While the Mac app is running, the same receiver APK is also available on the local network at:

```text
http://<MAC_WIFI_IP>:4173/apk
```

The longer `http://<MAC_WIFI_IP>:4173/receiver.apk` path works too.
If port `4173` is busy, the desktop app automatically uses a free port. In that case, use the **Short TV APK URL** shown in the Mac UI instead of typing the example URL.
For a manually sideloaded TV app, use the **TV Receiver URL** shown in the Mac UI when the receiver asks where to connect.

## Run The Browser Sender

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:4173
```

## Build The Android TV Receiver

The Mac sender can build this automatically when you click **Install and launch receiver** and the APK is missing.
You can also use the explicit **Build receiver APK** button, or run the project wrapper command:

```bash
npm run build:receiver
```

Expected APK path:

```text
apps/android-tv-receiver/app/build/outputs/apk/debug/app-debug.apk
```

A standalone copy is also written to:

```text
outputs/tcl-tv-cast-receiver-debug.apk
```

You need Android SDK packages for `compileSdk 35`. The Mac UI can install those locally into `.tools/android-sdk` with **Install Android SDK**. You do not need a system Gradle install; `apps/android-tv-receiver/gradlew` downloads Gradle into the project cache.

Android Studio can also open `apps/android-tv-receiver` and build the debug APK.

## Install On TCL Google TV / Android TV

1. Put the Mac and TCL TV on the same Wi-Fi network.
2. On the TV, enable Developer options.
3. Enable ADB debugging or Wireless debugging.
4. Start the Mac sender with `npm run app`.
5. Check the install readiness line for ADB, Android SDK, and receiver APK status.
6. Click **Scan Wi-Fi for TVs**.
7. Select the discovered TV candidate, or enter the TV ADB install target manually as `IP` or `IP:ADB_PORT`.
8. If the TV shows a wireless debugging pairing screen, enter the pairing `IP:port` and code exactly as shown by the TV, then click **Pair wireless debugging**.
9. After successful pairing, the app refreshes **ADB devices** automatically; if exactly one ready device is found, it is selected automatically. You can also click **Show ADB devices** manually.
10. Click **Install and launch receiver** for the first install. If ADB or Android SDK build packages are missing, the Mac app asks for Android SDK License confirmation and installs them locally before continuing. If the APK is missing, it builds it first through the project Gradle wrapper, then installs and launches it.
11. The separate **Install ADB tools**, **Install Android SDK**, and **Build receiver APK** buttons remain available for manual diagnostics.
12. If ADB is inconvenient, use the **Short TV APK URL** shown in the Mac UI, or click **Download APK** on the Mac, then open that URL on the TV with a browser/Downloader app and sideload the APK manually.
13. After manual sideloading, open **TCL TV Cast** on the TV. If it asks for a URL, enter the **TV Receiver URL** shown in the Mac UI. You may enter the full URL or just `MAC_IP:PORT`; the TV app will add `/tv`.
14. Later, use **Launch receiver only** to reopen the already installed TV app without reinstalling the APK.
15. The TV app remembers the last Mac sender URL, so launching it from the TCL app launcher can reconnect to the last used sender if the Mac server is still reachable.
16. The Mac UI remembers the last TV target, Mac network address, and pairing target on this Mac.
17. The TV app registers itself in the Mac UI using the Android TV manufacturer/model name when available.

The TV receiver keeps the screen awake and uses fullscreen immersive mode while it is open.
When sharing stops, the Mac sender sends a stop signal so the TV clears the last frame and returns to waiting mode.
The Mac sender includes stream quality controls for 720p/1080p and 30/60 fps; the selection is remembered on this Mac.
Audio capture is optional through **Include audio** and depends on what macOS/Electron/browser allows for the selected source.
During sharing, the Mac sender shows approximate outbound video bitrate from WebRTC stats.
The TV receiver shows connection states such as connecting, connected, interrupted, and failed.
The TV receiver explicitly permits local HTTP sender URLs for this LAN-only MVP.

The Mac sender runs:

```bash
adb pair <PAIRING_IP:PAIRING_PORT> <PAIRING_CODE>
adb connect <TV_IP>:5555
adb install -r <receiver app-debug.apk>
adb shell am start -n com.tclcast.receiver/.MainActivity --es serverUrl http://<MAC_IP>:4173/tv
```

For repeat launches, it only runs:

```bash
adb connect <TV_IP_OR_TARGET>
adb shell am start -n com.tclcast.receiver/.MainActivity --es serverUrl http://<MAC_IP>:4173/tv
```

## Browser-Only Smoke Test

You can test signaling and WebRTC without a TV:

1. Run `npm run dev`.
2. Open `http://localhost:4173`.
3. Open `http://localhost:4173/tv` in another browser tab.
4. The receiver tab should appear in the TV list.
5. Click start sharing and choose a screen/window.

## Discovery Notes

The scan combines two open local-network signals:

- Google Cast / Chromecast mDNS (`_googlecast._tcp`) to find likely Android TV / Google TV devices by name.
- Local `/24` TCP probes for wireless ADB on port `5555`.

Cast/mDNS discovery can show the TV before ADB is enabled, but installation still requires ADB or Wireless debugging. Some Android TV / Google TV devices use random wireless debugging ports. Use the TV's displayed pairing `IP:port` for pairing, and use the displayed connect target or `IP:5555` for install.

## Install Readiness

The Mac UI and `npm run doctor` check:

- whether `adb` is available from PATH;
- whether Android SDK exists in `ANDROID_HOME`, `ANDROID_SDK_ROOT`, or `~/Library/Android/sdk`;
- whether project-local Android SDK exists at `.tools/android-sdk`;
- whether a receiver build-ready SDK has `platforms;android-35` and `build-tools;35.0.0`;
- whether SDK `platform-tools/adb` exists;
- which `adb` path will be used for pair/install;
- whether project-local Platform Tools exist at `.tools/platform-tools/adb`;
- whether the receiver APK exists at:

```text
apps/android-tv-receiver/app/build/outputs/apk/debug/app-debug.apk
```

If `adb` is not in PATH but SDK `platform-tools/adb` or project-local `.tools/platform-tools/adb` exists, the app uses that copy automatically. If no ADB is available, **Install and launch receiver** offers to install ADB tools locally. If Android SDK build packages are missing and the receiver APK must be built, **Install and launch receiver** offers to install the SDK packages locally before continuing.
