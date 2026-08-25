import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * localStorage 에 붙은 useState.
 * 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서도 메모리 상태로 그대로 동작한다.
 */
export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initialValue;
      return JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      /* 저장 실패는 조용히 무시 — 화면 동작에는 영향이 없다 */
    }
  }, [value]);

  const reset = useCallback(() => {
    setValue(initialValue);
    try {
      window.localStorage.removeItem(keyRef.current);
    } catch {
      /* noop */
    }
    // initialValue 는 호출부에서 리터럴로 넘어오므로 의존성에서 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [value, setValue, reset];
}

export default usePersistentState;
