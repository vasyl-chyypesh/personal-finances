import { useEffect, useRef, useState } from 'react';

/**
 * Tracks an element's content-box width via `ResizeObserver`. Used by the
 * rate chart to render its SVG at real pixel dimensions (1 unit = 1px) so text
 * and hover dots are never distorted by viewBox stretching.
 */
export function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
