import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  className?: string;
}

/*
 * Horizontal scroll container whose scrollbar sits above the
 * content instead of below it.
 */
export function TopScrollContainer({ children, className }: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const measure = () => {
      setScrollWidth(content.scrollWidth);
      setOverflowing(content.scrollWidth > content.clientWidth + 1);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(content);
    if (content.firstElementChild) {
      observer.observe(content.firstElementChild);
    }

    return () => observer.disconnect();
  }, [children]);

  const sync = (source: HTMLDivElement | null, target: HTMLDivElement | null) => {
    if (source && target && target.scrollLeft !== source.scrollLeft) {
      target.scrollLeft = source.scrollLeft;
    }
  };

  return (
    <div className={className}>
      <div
        ref={topRef}
        className={cn('overflow-x-auto overflow-y-hidden', !overflowing && 'hidden')}
        onScroll={() => sync(topRef.current, contentRef.current)}
      >
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>

      <div
        ref={contentRef}
        className="overflow-x-auto no-scrollbar"
        onScroll={() => sync(contentRef.current, topRef.current)}
      >
        {children}
      </div>
    </div>
  );
}
