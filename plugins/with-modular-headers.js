// Expo config plugin — react-native-firebase v24 + Expo SDK 54 + New Arch + useFrameworks:static
// 조합에서 발생하는 non-modular header include 빌드 에러 회피용.
//
// Podfile 에 두 가지 변경 주입:
//   1) use_modular_headers!  — 가능한 한 modular header 로 통일
//   2) 기존 post_install 블록 안에 build_settings 패치 삽입 — 모든 pod target 의
//      CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE 을 'NO' 로 강제.
//      CocoaPods 는 post_install 블록 1개만 허용하므로 새로 추가하지 말고
//      기존 블록 시작 직후에 우리 코드를 끼워넣어야 함.

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MODULAR_MARKER = "use_modular_headers!";
const INJECT_MARKER = "# === modular-include warning suppression injected ===";

// 기존 post_install 블록 시작 직후에 끼울 코드.
// `installer` 변수는 기존 블록 시그니처에서 이미 정의돼 있으므로 그대로 사용.
const INJECT_SNIPPET = `  ${INJECT_MARKER}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
    end
  end
  # === end injection ===
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

  // 2) 기존 post_install 블록 시작 직후에 build_settings 패치 삽입
  if (!next.includes(INJECT_MARKER)) {
    // 매칭: `post_install do |installer|` 다음 줄에 우리 코드 삽입
    const postInstallRe = /(post_install\s+do\s+\|\s*[^|]+\|\s*\n)/;
    if (postInstallRe.test(next)) {
      next = next.replace(postInstallRe, `$1${INJECT_SNIPPET}`);
    } else {
      // 폴백 — 기존 post_install 이 없으면 파일 끝에 새로 추가
      next =
        next.trimEnd() +
        "\n\n" +
        "post_install do |installer|\n" +
        INJECT_SNIPPET +
        "end\n";
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
          "[with-modular-headers] Podfile patched: use_modular_headers! + injected build_settings into existing post_install",
        );
      } else {
        console.log("[with-modular-headers] Podfile already patched, skipping");
      }
      return cfg;
    },
  ]);
};
