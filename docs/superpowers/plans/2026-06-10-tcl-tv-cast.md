# TCL TV Cast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable MVP for streaming a Mac screen to a TCL Google TV / Android TV over the same Wi-Fi network.

**Architecture:** The Mac side is a Node.js local sender with a browser UI, Socket.IO signaling, WebRTC sender logic, and ADB installer endpoints. The TV side is a minimal Android TV WebView receiver launched with the Mac sender URL.

**Tech Stack:** Node.js, Express, Socket.IO, browser WebRTC APIs, Android Java, Android Gradle Plugin.

---

## File Structure

- `package.json`: root scripts for running, packaging, and testing the Electron app and browser sender.
- `scripts/doctor.js`: command-line setup doctor for Android SDK/ADB/APK readiness.
- `apps/mac-desktop/main.js`: Electron main process that embeds the sender app.
- `apps/mac-sender/src/server.js`: Express and Socket.IO server.
- `apps/mac-sender/src/network.js`: local IPv4 discovery helpers.
- `apps/mac-sender/src/discovery.js`: local `/24` ADB candidate scanner and Google Cast mDNS discovery helpers.
- `apps/mac-sender/src/adb.js`: ADB command planning and execution helpers.
- `apps/mac-sender/src/android-build.js`: Android receiver build command helpers.
- `apps/mac-sender/src/setup-doctor.js`: Android SDK and platform-tools detection helpers.
- `apps/mac-sender/src/android-sdk.js`: project-local Android SDK bootstrap helpers.
- `apps/mac-sender/test/setup-status.test.js`: setup readiness tests for ADB/APK state.
- `apps/mac-sender/public/index.html`: Mac sender UI.
- `apps/mac-sender/public/tv.html`: Android TV receiver page loaded in WebView.
- `apps/mac-sender/public/styles.css`: shared sender and receiver styling.
- `apps/mac-sender/test/*.test.js`: unit tests for network and ADB helpers.
- `apps/android-tv-receiver`: Android TV APK project.
- `README.md`: setup, build, install, and smoke test instructions.

## Milestones

### Task 1: Mac Sender Core

- [x] Create Node package and install runtime/test dependencies.
- [x] Add Electron desktop shell for the Mac sender.
- [x] Add Electron Builder packaging metadata and `npm run package:mac`.
- [x] Build and smoke-launch packaged macOS app bundle locally.
- [x] Build and smoke-launch packaged macOS zip distribution locally.
- [x] Build and verify packaged macOS DMG distribution locally.
- [x] Build receiver APK and include it as an unpacked resource in packaged Mac artifacts.
- [x] Implement local IP discovery.
- [x] Implement ADB install command planning.
- [x] Implement ADB launch-only command planning for repeat use.
- [x] Implement ADB devices listing for connected target selection.
- [x] Implement ADB wireless debugging pairing command planning.
- [x] Implement setup readiness check for ADB and receiver APK.
- [x] Implement Android SDK and platform-tools detection.
- [x] Use SDK `platform-tools/adb` automatically when PATH `adb` is unavailable.
- [x] Use project-local `.tools/platform-tools/adb` automatically when PATH and SDK ADB are unavailable.
- [x] Add local Platform Tools install flow for missing ADB.
- [x] Add local Android SDK install flow for receiver APK build dependencies.
- [x] Select only receiver build-ready SDK paths for Gradle.
- [x] Add `npm run doctor` CLI for setup readiness.
- [x] Implement Android receiver build command using project wrapper.
- [x] Automatically build the receiver APK before install when the APK is missing.
- [x] Add tests for IP discovery and ADB command planning.

### Task 2: WebRTC Sender And Receiver

- [x] Implement Socket.IO receiver registration.
- [x] Implement sender UI with TV list, install form, screen capture, and signaling.
- [x] Implement Wi-Fi scan for Android TV ADB candidates.
- [x] Implement Google Cast mDNS TV discovery.
- [x] Implement wireless debugging pairing controls.
- [x] Implement install readiness status in the setup panel.
- [x] Implement receiver APK build button in the setup panel.
- [x] Let install-and-launch build the receiver APK automatically when needed.
- [x] Let install-and-launch offer missing ADB/SDK setup before continuing.
- [x] Implement launch-only button for already installed receivers.
- [x] Implement connected ADB devices list in the setup panel.
- [x] Persist last-used Mac setup fields for repeat sessions.
- [x] Implement TV receiver page with fullscreen video playback.
- [x] Implement explicit stop signaling so the TV clears stale frames after sharing stops.
- [x] Implement stream quality controls for resolution and frame rate.
- [x] Implement outbound WebRTC bitrate stats in the Mac sender UI.

### Task 3: Android TV Receiver APK

- [x] Create Android TV project.
- [x] Add project-local Gradle wrapper script.
- [x] Implement WebView activity that opens the sender-provided `serverUrl`.
- [x] Persist the last `serverUrl` so the TV launcher can reconnect to the last sender.
- [x] Append Android TV manufacturer/model to the receiver URL for clearer Mac device lists.
- [x] Keep the TV awake and immersive while the receiver is open.
- [x] Add Android manifest for TV launcher and internet access.

### Task 4: Documentation And Validation

- [x] Write README with TCL setup path.
- [x] Run unit tests.
- [x] Start local sender server.
- [x] Build APK with local Android SDK and Gradle wrapper.
