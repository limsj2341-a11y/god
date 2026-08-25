const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium ' +
  'transition-[transform,opacity,background-color,border-color] duration-300 ' +
  'disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]';

const variants = {
  // 앰버 위에는 항상 어두운 글자 — 배경이 밝아져도 대비가 유지된다
  primary: 'bg-accent text-[#16171A] hover:bg-accent/90',
  ghost: 'border border-hair text-ink hover:bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]',
  quiet: 'text-soft hover:text-ink px-3',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}

export default Button;
