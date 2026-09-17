import { useEffect, useRef, type RefObject } from 'react';

interface Props {
  /* The element that actually scrolls (the app shell's <main>). */
  target: RefObject<HTMLElement | null>;
}

/* Thin bar showing how far the content has been scrolled. */
export function ScrollProgress({ target }: Props) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = target.current;
    const bar = barRef.current;
    if (!el || !bar) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = el.scrollHeight - el.clientHeight;
      const ratio = max > 1 ? el.scrollTop / max : 0;
      bar.style.transform = `scaleX(${ratio})`;
      bar.style.opacity = max > 1 && ratio > 0 ? '1' : '0';
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    el.addEventListener('scroll', schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    return () => {
      el.removeEventListener('scroll', schedule);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <div data-print-hide aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5">
      <div
        ref={barRef}
        className="h-full origin-left bg-seal opacity-0 transition-opacity duration-200"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
