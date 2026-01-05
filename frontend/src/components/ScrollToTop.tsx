import { useEffect, RefObject } from "react";

type Props = {
  /** The element you want to scroll to (e.g., the top of the fields). */
  targetRef: RefObject<HTMLElement>;
  /** Change this value whenever you want to scroll (e.g., Date.now()). */
  when: any;
  /** Pixels to offset for sticky headers/navs. Default: 80px. */
  offset?: number;
  /** Optional: scroll a specific container instead of window. */
  containerRef?: RefObject<HTMLElement>;
};

export default function ScrollToTop({
  targetRef,
  when,
  offset = 80,
  containerRef,
}: Props) {
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    // If you have a scrollable container, use that; else, use window
    const scroller = containerRef?.current;

    // Wait one frame so the newly added fields actually exist in the DOM
    const id = requestAnimationFrame(() => {
      if (scroller) {
        const elTop =
          el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        const top = elTop + scroller.scrollTop - offset;
        scroller.scrollTo({ top, behavior: "smooth" });
      } else {
        const top =
          el.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    });

    return () => cancelAnimationFrame(id);
  }, [when, targetRef, offset, containerRef]);

  return null;
}
