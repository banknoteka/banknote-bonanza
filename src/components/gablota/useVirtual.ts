import { useEffect, useRef, useState } from "react";

export function useVirtual(count: number, rowHeight: number, overscan = 6) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    const onScroll = () => setTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => (ro.disconnect(), el.removeEventListener("scroll", onScroll));
  }, []);
  const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const end = Math.min(count, Math.ceil((top + size.h) / rowHeight) + overscan);
  const scrollToRow = (r: number) => {
    const el = ref.current;
    if (!el) return;
    const y = r * rowHeight;
    if (y < el.scrollTop) el.scrollTop = y;
    else if (y + rowHeight > el.scrollTop + el.clientHeight) el.scrollTop = y + rowHeight - el.clientHeight;
  };
  return { ref, start, end, total: count * rowHeight, size, scrollToRow };
}
