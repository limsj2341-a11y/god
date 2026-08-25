import { useInView } from '../../hooks/useInView';

/**
 * 뷰포트에 들어오면 opacity/transform 으로 떠오른다.
 * 실제 전환은 CSS(.reveal)가 담당하고, 여기서는 data 속성만 토글한다 —
 * prefers-reduced-motion 대응도 CSS 한 곳에서 끝난다.
 */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const [ref, inView] = useInView();

  return (
    <Tag
      ref={ref}
      data-visible={inView ? 'true' : 'false'}
      style={{ '--reveal-delay': `${delay}ms` }}
      className={`reveal ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
