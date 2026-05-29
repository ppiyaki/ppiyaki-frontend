// Expo config plugin — react-native-firebase v24 + Expo SDK 54 + New Arch + useFrameworks:static
// 조합에서 발생하는 non-modular header include 빌드 에러 회피용.
//
// 두 가지 변경을 Podfile 에 주입한다:
//   1) use_modular_headers!  — 가능한 한 modular header 로 통일
//   2) post_install hook — 모든 pod target 의 CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE
//      을 'NO' 로 강제. (1)이 안 먹는 RNFBApp/React-Core 헤더 import 까지 경고만 띄우고
//      에러로 안 만드는 brute-force fallback.

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MODULAR_MARKER = "use_modular_headers!";
const POSTINSTALL_MARKER = "# === non-modular-include warning suppression ===";

const POST_INSTALL_SNIPPET = `
${POSTINSTALL_MARKER}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
    end
  end
end
`;

function patchPodfile(contents) {
  let next = contents;

  // 1) use_modular_headers! 추가 (platform 줄 다음)
  if (!next.includes(MODULAR_MARKER)) {
    const platformRe = /(platform\s+:ios[^\n]*\n)/;
    if (platformRe.test(next)) {
      next = next.replace(platformRe, `$1${MODULAR_MARKER}\n`);
    } else {
      next = `${MODULAR_MARKER}\n${next}`;
    }
  }

  // 2) post_install hook 추가 (파일 끝)
  if (!next.includes(POSTINSTALL_MARKER)) {
    next = next.trimEnd() + "\n" + POST_INSTALL_SNIPPET;
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
          "[with-modular-headers] Podfile patched: use_modular_headers! + post_install hook",
        );
      } else {
        console.log("[with-modular-headers] Podfile already patched, skipping");
      }
      return cfg;
    },
  ]);
};
