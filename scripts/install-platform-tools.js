import { installPlatformTools } from '../apps/mac-sender/src/platform-tools.js';

if (!process.argv.includes('--accept-android-sdk-license')) {
  console.error('This downloads Android SDK Platform Tools from Google.');
  console.error('Run: npm run install:adb -- --accept-android-sdk-license');
  process.exit(1);
}

const log = await installPlatformTools();
for (const entry of log) {
  console.log(`$ ${entry.command}`);
  console.log(entry.output);
}
