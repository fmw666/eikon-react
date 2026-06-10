/**
 * @file use-in-view.ts
 * @description Small viewport-visibility hook shared by the AgentToil section
 * and its AgentChatReplay mock.
 *
 * ⚠️ Observe a NON-3D-TRANSFORMED element. IntersectionObserver does not
 * deliver entries for a target that sits inside a 3D-transformed (`matrix3d`,
 * i.e. `perspective()` / `rotateX/Y`) subtree — the callback simply never
 * fires, so the gate would latch `false` forever and anything it drives (here:
 * the replay loop) freezes. The chat panel is wrapped in a 3D float tilt, so
 * the AgentToil section observes the panel's *untransformed* container and
 * passes the result down, rather than letting the panel observe itself.
 */

import { useEffect, useState, type RefObject } from 'react';

/**
 * True while `ref` is at least partly on screen (≥20% visible). Pass
 * `enabled = false` to opt out (e.g. when a parent supplies the visibility
 * signal instead) — the hook then never observes and stays `true`.
 *
 * FAIL-OPEN by design: it starts `true` and only flips to `false` when the
 * observer *explicitly* reports the element off-screen. It deliberately does
 * NOT pre-emptively assume "off-screen until proven visible", because an
 * IntersectionObserver can fail to deliver its initial callback entirely —
 * e.g. when the target is inside a 3D-transformed subtree, or when a
 * background/throttled renderer pauses the intersection lifecycle. Pre-setting
 * `false` in those cases latches the gate shut forever and freezes whatever it
 * drives. Worst case here is a brief off-screen animation, never a freeze.
 */
export function useInView(ref: RefObject<HTMLElement | null>, enabled = true): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled]);

  return inView;
}
