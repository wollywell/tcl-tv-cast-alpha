import { buildReceiverApk } from '../apps/mac-sender/src/android-build.js';

const log = await buildReceiverApk();
for (const entry of log) {
  console.log(`$ ${entry.command}`);
  if (entry.env) {
    console.log(entry.env);
  }
  console.log(entry.output);
}
