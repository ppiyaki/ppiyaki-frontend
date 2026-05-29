// Expo config plugin — Podfile 에 `use_modular_headers!` 를 강제 주입.
//
// 배경: react-native-firebase v24 + Expo SDK 54 + New Architecture + useFrameworks:static
// 조합에서 RNFBApp 가 static framework 로 빌드되는데, React-Core 의 헤더들이
// modular_headers 가 아니라 빌드 실패. Expo 의 자동 modular_headers 처리는 일부 pod 에만
// 적용되고 React-Core 까지 도달하지 않는 경우가 있어, 명시적으로 Podfile 최상단에
// `use_modular_headers!` 를 박아 모든 pod 를 modular 로 강제한다.

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "use_modular_headers!";

function patchPodfile(contents) {
  if (contents.includes(MARKER)) return contents;
  // platform :ios, '...' 줄 바로 다음에 use_modular_headers! 추가
  const platformRe = /(platform\s+:ios[^\n]*\n)/;
  if (platformRe.test(contents)) {
    return contents.replace(platformRe, `$1${MARKER}\n`);
  }
  // 폴백: 파일 최상단에 삽입
  return `${MARKER}\n${contents}`;
}

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile",
      );
      if (!fs.existsSync(podfilePath)) {
        console.warn(
          "[with-modular-headers] Podfile not found at",
          podfilePath,
        );
        return cfg;
      }
      const original = fs.readFileSync(podfilePath, "utf8");
      const patched = patchPodfile(original);
      if (patched !== original) {
        fs.writeFileSync(podfilePath, patched, "utf8");
        console.log("[with-modular-headers] use_modular_headers! injected");
      }
      return cfg;
    },
  ]);
};
