// Expo config plugin — react-native-firebase v24 + Expo SDK 54 + Xcode 26 + New Arch
// + useFrameworks:static 조합에서 발생하는 non-modular header include 빌드 에러 회피.
//
// 핵심 fix: Podfile 최상단에 `$RNFirebaseAsStaticFramework = true` 주입.
// 이건 react-native-firebase 공식 권장 우회법으로, RNFirebase 가 static framework 가
// 아니라 static library 로 빌드되도록 만들어 modular header 요구사항 자체를 회피한다.
//
// 추가로 보조 fix 두 개:
//   - use_modular_headers!  — 가능한 한 modular header 로 통일
//   - 기존 post_install 블록 안에 build_settings 패치 — non-modular include 경고를
//     에러로 처리하지 않도록 + explicit module 비활성화 (Xcode 26 precompile 우회)

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const RNFB_STATIC_FRAMEWORK_MARKER = "$RNFirebaseAsStaticFramework";
const MODULAR_MARKER = "use_modular_headers!";
const INJECT_MARKER = "# === RNFB non-modular-include suppression injected ===";

const INJECT_SNIPPET = `  ${INJECT_MARKER}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
      # Xcode 26 의 explicit module precompile 단계도 우회
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
    end
  end
  # === end injection ===
`;

function patchPodfile(contents) {
  let next = contents;

  // 1) Podfile 최상단에 $RNFirebaseAsStaticFramework = true (최우선 핵심 fix)
  if (!next.includes(RNFB_STATIC_FRAMEWORK_MARKER)) {
    next = `${RNFB_STATIC_FRAMEWORK_MARKER} = true\n` + next;
  }

  // 2) use_modular_headers! (보조)
  if (!next.includes(MODULAR_MARKER)) {
    const platformRe = /(platform\s+:ios[^\n]*\n)/;
    if (platformRe.test(next)) {
      next = next.replace(platformRe, `$1${MODULAR_MARKER}\n`);
    }
  }

  // 3) 기존 post_install 블록 안에 build_settings 패치 (보조)
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
          "[with-modular-headers] Podfile patched: $RNFirebaseAsStaticFramework + use_modular_headers! + post_install build_settings",
        );
      } else {
        console.log("[with-modular-headers] Podfile already patched, skipping");
      }
      return cfg;
    },
  ]);
};
