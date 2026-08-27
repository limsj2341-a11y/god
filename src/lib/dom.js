/**
 * 문서 기준 top.
 *
 * getBoundingClientRect 를 쓰면 안 된다. 그것은 조상에 걸린 transform 을
 * 반영하는데, 이 사이트의 막은 화면에 붙어 있고 글은 transform 으로 밀린다.
 * 그래서 같은 요소라도 지금 얼마나 읽었느냐에 따라 값이 달라진다
 * (실측: 같은 목차 점을 눌렀는데 누른 위치에 따라 도착지가 세 곳이었다).
 *
 * offsetTop 은 레이아웃 값이라 transform 의 영향을 받지 않는다.
 */
export function documentTop(el) {
  let y = 0;
  let node = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return y;
}

export default documentTop;
