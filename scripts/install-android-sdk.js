import { installAndroidSdk } from '../apps/mac-sender/src/android-sdk.js';

if (!process.argv.includes('--accept-android-sdk-license')) {
  console.error('This downloads Android SDK command-line tools and build packages from Google.');
  console.error('Run: npm run install:android-sdk -- --accept-android-sdk-license');
  process.exit(1);
}

const log = await installAndroidSdk();
for (const entry of log) {
  console.log(`$ ${entry.command}`);
  console.log(entry.output);
}
