/**
 * 소멸 3단계에서 흘러내린 빛이 그대로 4막의 식탁 조명이 된다.
 *
 * 화면에 고정된 레이어 하나로, 위치와 밝기는 Page(3막)가 루트에 써 주는
 * --flow-y / --flow-o 를 그대로 읽는다. 자바스크립트에서 이 요소를 직접
 * 만지지 않으므로 소멸 계산과 조명 표현이 서로 얽히지 않는다.
 *
 * main 보다 아래(z-0)에 깔려서 본문 글자를 덮지 않는다.
 */
export function TableLight() {
  return <div aria-hidden="true" className="table-light" />;
}

export default TableLight;
