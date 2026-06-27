/**
 * cold start(앱 종료 상태에서 알림 탭) 시 딥링크 보류 저장소.
 *
 * 앱 종료 상태에서 알림을 탭하면 진입점 app/index.tsx 가 인증 라우팅(<Redirect>)을
 * 끝내기 전이라 내비게이터가 준비되지 않았다. 이때 곧바로 router.push 를 하면 redirect 와
 * 충돌해 index 의 로딩 화면(노란 배경)에서 멈춘다.
 *
 * 그래서 cold start 알림은 여기에 보류해두고, 인증 후 실제 메인 레이아웃이 마운트되는
 * 시점에 useConsumeDeepLink() 가 꺼내서 이동한다. (내비게이터가 완전히 준비된 뒤라 안전)
 */
export interface PendingDeepLink {
  pathname: string;
  params?: Record<string, string>;
}

let pending: PendingDeepLink | null = null;

export function setPendingDeepLink(link: PendingDeepLink): void {
  pending = link;
}

/** 보류된 딥링크를 반환하고 비운다 (1회성). */
export function consumePendingDeepLink(): PendingDeepLink | null {
  const p = pending;
  pending = null;
  return p;
}
