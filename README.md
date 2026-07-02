# ppiyaki-frontend

시니어의 복약을 돕고, 보호자가 원격에서 복약 상태를 챙길 수 있는 복약 관리 모바일 앱 **삐약이** 의 React Native(Expo) 기반 프론트엔드입니다.

## 기술 스택

- **런타임/프레임워크**: Expo SDK 54, React Native 0.81, React 19
- **라우팅**: expo-router (파일 기반 라우팅, `app/` 디렉터리)
- **언어**: TypeScript
- **푸시 알림**: `@react-native-firebase/messaging` (FCM)
- **소셜 로그인**: `@react-native-seoul/kakao-login` (카카오)
- **보안 저장소**: `expo-secure-store` (토큰 보관)
- **카메라/이미지**: expo-camera, expo-image-manipulator, expo-image-picker (처방전 촬영·복약 인증)

> ⚠️ 이 앱은 네이티브 모듈(Firebase, 카카오 로그인)을 사용하므로 **Expo Go로는 실행되지 않습니다.** 아래처럼 **개발 빌드(dev client)** 로 실행하세요.

## 로컬 개발 환경

### 1) 의존성 설치

```bash
npm install
```

### 2) 개발 빌드 준비

네이티브 모듈 때문에 최초 1회 개발 빌드가 필요합니다. (EAS 또는 로컬 네이티브 빌드)

```bash
# EAS 개발 빌드 (권장)
npx eas build --profile development --platform android   # 또는 ios
```

빌드된 dev client 앱을 기기/에뮬레이터에 설치합니다.

### 3) 개발 서버 실행

```bash
npx expo start --dev-client
```

- Android: `npx expo start --android`
- iOS: `npx expo start --ios`
- 설치된 dev client 앱에서 QR/URL로 접속

### 4) 린트

```bash
npm run lint
```

## 프로젝트 구조

```
app/            expo-router 화면 (파일 기반 라우팅)
  (tabs)/       시니어 메인 탭
  family/       보호자 메인 탭
  prescription/ 처방전 등록·검토 플로우
  dose-confirm/ 복약 인증 플로우
  signup/       가입·온보딩
services/       API 호출 계층 (auth, api, prescriptions, schedules ...)
hooks/          커스텀 훅 (알림 딥링크 등)
components/     공용 UI 컴포넌트
contexts/       전역 컨텍스트 (confirm 모달 등)
constants/      테마·상수
assets/         폰트·이미지
```

## 주요 기능

- 📷 처방전 촬영 → OCR 자동 등록
- 💊 식사 시간 기준 복약 알림(FCM 푸시)
- ✅ 사진 기반 복약 인증
- 👨‍👩‍👧 보호자-시니어 연동 및 복약 모니터링
- 🤖 복약 정보 안내 챗봇, 캐릭터 성장·리워드

## 커밋 / 브랜치 컨벤션

- 커밋 메시지: AngularJS 컨벤션 (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`)

  ```
  feat: 복약 알림 딥링크 처리

  - 본문 (선택)
  ```

- `main` 직접 푸시 대신 브랜치 → PR → 리뷰 후 머지 권장
- 푸시 전 타입 체크·린트 통과 확인
  ```bash
  npx tsc --noEmit
  npm run lint
  ```

## 참고

- Expo 문서: https://docs.expo.dev
- expo-router: https://docs.expo.dev/router/introduction
