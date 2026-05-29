// Expo config plugin — react-native-firebase v24 + Expo SDK 54 + Xcode 26 + New Arch
// 조합에서 발생하는 non-modular header include 빌드 에러 회피.
//
// 핵심 접근: Pod 들을 framework 가 아닌 static library 로 빌드하고, 그 위에
// use_modular_headers! 로 Firebase 가 요구하는 modular header 만 만족시킨다.
// (useFrameworks:static 으로 모두 framework 가 되면 React-Core 의 non-modular
// 헤더 import 에서 실패. framework 없으면 그 검증 자체가 발생 안 함.)
//
// Podfile 패치 두 가지:
//   1) use_modular_headers!  — platform 줄 직후에 삽입. Firebase iOS SDK 요구사항 충족
//   2) post_install 안에 build_settings 패치 — 잔여 non-modular 경고를 에러로
//      처리하지 않도록 + Xcode 26 explicit module precompile 단계도 비활성

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MODULAR_MARKER = "use_modular_headers!";
const INJECT_MARKER = "# === RNFB non-modular-include suppression injected ===";

const INJECT_SNIPPET = `  ${INJECT_MARKER}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
    end
  end
  # === end injection ===
`;

function patchPodfile(contents) {
  let next = contents;

  // 1) use_modular_headers! (platform 줄 다음)
  if (!next.includes(MODULAR_MARKER)) {
    const platformRe = /(platform\s+:ios[^\n]*\n)/;
    if (platformRe.test(next)) {
      next = next.replace(platformRe, `$1${MODULAR_MARKER}\n`);
    }
  }

  // 2) 기존 post_install 블록 안에 build_settings 패치
  if (!next.includes(INJECT_MARKER)) {
    const postInstallRe = /(post_install\s+do\s+\|\s*[^|]+\|\s*\n)/;
    if (postInstallRe.test(next)) {
      next = next.replace(postInstallRe, `$1${INJECT_SNIPPET}`);
    }
  }

  return next;
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
        console.log(
          "[with-modular-headers] Podfile patched: use_modular_headers! + post_install build_settings",
        );
      } else {
        console.log("[with-modular-headers] Podfile already patched, skipping");
      }
      return cfg;
    },
  ]);
};
