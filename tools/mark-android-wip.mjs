// Capacitor rewrites android/app/src/main/res/xml/config.xml on every sync
// with a hardcoded Cordova widget version of 1.0.0. Android versionName /
// versionCode live in android/app/build.gradle and are not touched here.
// This only relabels that generated widget so it matches the evaluation build.
import fs from "node:fs";

const file = "android/app/src/main/res/xml/config.xml";
const text = fs.readFileSync(file, "utf8");
const next = text.replace('<widget version="1.0.0"', '<widget version="112.13-rd17-wip.1"');
if (next === text) {
  if (text.includes('<widget version="112.13-rd17-wip.1"')) {
    console.log("config.xml widget version already 112.13-rd17-wip.1");
    process.exit(0);
  }
  console.error("config.xml widget version was not the Capacitor 1.0.0 placeholder");
  process.exit(1);
}
fs.writeFileSync(file, next);
console.log("marked generated config.xml widget version 112.13-rd17-wip.1");
