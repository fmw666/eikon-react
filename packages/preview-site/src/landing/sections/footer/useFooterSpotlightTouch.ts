/**
 * @file useFooterSpotlightTouch.ts
 * @description Touch (long-press) + optional gyroscope spotlight for the
 * footer on touch devices. Desktop pointer devices skip this — see
 * {@link ./useFooterSpotlightDesktop}.
 */

import { useEffect } from 'react';

import type { FooterSpotlightOptions } from './useFooterSpotlight.shared';

export function useFooterSpotlightTouch({
  containerRef,
  spotlightRef,
  meadowRef,
  setMeadowActivated,
  setLightActive,
}: FooterSpotlightOptions) {
  // Touch + optional gyroscope spotlight for mobile (touch) devices.
  //
  // The touch path is gated on a long-press: the user has to hold a
  // finger still for ~280ms before the spotlight activates. Once active,
  // we suppress page scroll, text selection and the iOS callout menu so
  // the gesture is a *pure* light-control affordance — dragging never
  // accidentally selects copy or scrolls the page out from under the
  // light. A normal short tap or a tap-then-scroll never triggers the
  // gesture, so taps on links / buttons inside the footer still work.
  //
  // Gyroscope is an enhancement on top: once permission is granted (iOS)
  // or events fire spontaneously (Android), tilt drives the spotlight
  // when the user isn't actively touching. A 1.5s holdoff after touchend
  // keeps gyro from yanking the spotlight away the instant the user
  // lifts their finger. On insecure-context iOS Safari (HTTP / Lockdown)
  // the `DeviceOrientationEvent` global is undefined; we probe it with
  // `typeof` so the touch path keeps working even when gyro is missing.
  useEffect(() => {
    const el = containerRef.current;
    const spot = spotlightRef.current;
    if (!el || !spot) return;
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(pointer: fine)').matches
    ) {
      return;
    }

    // Smaller spotlight on touch — desktop's 360px radius is sized for
    // a 1280+ canvas; on a phone footer it would near-fill the surface
    // and lose its "this is a finger-sized light" affordance.
    const SPOT_HALF = 180;
    const TOUCH_GYRO_HOLDOFF_MS = 1500;
    const LONG_PRESS_MS = 280;
    const MOVE_CANCEL_PX = 10;

    // Resize the spotlight DOM to match the mobile radius (the JSX
    // baseline below is desktop-sized).
    spot.style.width = `${SPOT_HALF * 2}px`;
    spot.style.height = `${SPOT_HALF * 2}px`;
    spot.style.background = `radial-gradient(circle ${SPOT_HALF}px, var(--accent-glow), transparent 70%)`;

    let rafId = 0;
    let smoothX = 0.5;
    let smoothY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let touchActive = false;
    let touchEndedAt = 0;
    let inViewport = true;
    let ticking = false;
    let pressTimer: number | null = null;
    let pressStartX = 0;
    let pressStartY = 0;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const tickStep = () => {
      smoothX += (targetX - smoothX) * 0.18;
      smoothY += (targetY - smoothY) * 0.18;

      const footerRect = el.getBoundingClientRect();
      const localX = smoothX * footerRect.width;
      const localY = smoothY * footerRect.height;
      // Spot center tracks the full footer range [0, width] / [0, height].
      // The spot DOM (2 * SPOT_HALF wide) extends past the footer edges
      // when the center is near them; the footer's `overflow:hidden`
      // clips the bleed. Don't pre-clamp the center — that would
      // shrink the reachable range to a tiny window in the middle on
      // narrow viewports (footer width ~ 2 * SPOT_HALF on phones).
      spot.style.transform = `translate3d(${localX - SPOT_HALF}px,${localY - SPOT_HALF}px,0)`;

      const meadowEl = meadowRef.current;
      if (meadowEl) {
        const meadowRect = meadowEl.getBoundingClientRect();
        // Convert footer-normalized smooth coords back into client
        // space, then into meadow-local. The meadow is a small strip
        // anchored mid-footer; multiplying the footer-normalized coord
        // by meadow size (the previous bug) re-stretched the *entire*
        // footer onto the meadow rect, so a touch at the top of the
        // footer would land at the top of the grass, lighting it where
        // the spotlight clearly isn't. Doing the round-trip via client
        // coords matches the desktop pointer path and keeps spotlight +
        // meadow in lockstep.
        const clientX = footerRect.left + localX;
        const clientY = footerRect.top + localY;
        meadowEl.style.setProperty(
          '--eikon-meadow-mx',
          `${clientX - meadowRect.left}px`,
        );
        meadowEl.style.setProperty(
          '--eikon-meadow-my',
          `${clientY - meadowRect.top}px`,
        );
      }
    };

    const tick = () => {
      rafId = requestAnimationFrame(() => {
        if (ticking && inViewport) {
          tickStep();
          tick();
        } else {
          ticking = false;
        }
      });
    };

    let activated = false;

    const startTick = () => {
      if (ticking || !inViewport) return;
      ticking = true;
      // Activation gates the meadow visibility (`.eikon-footer-gyro` is
      // historical naming — touch input now activates it too). The class
      // is owned by React state so this useEffect's class adds survive
      // any re-render of the footer (e.g. when `footerLit` flips on
      // flower click).
      if (!activated) {
        activated = true;
        setMeadowActivated(true);
      }
      tick();
    };

    const setTargetFromClient = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetX = clamp((clientX - rect.left) / rect.width, 0, 1);
      targetY = clamp((clientY - rect.top) / rect.height, 0, 1);
    };

    const cancelPressTimer = () => {
      if (pressTimer !== null) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    const beginGesture = (clientX: number, clientY: number) => {
      setTargetFromClient(clientX, clientY);
      // Snap the smoothed position to the touch on activation so the
      // spotlight appears under the finger instead of drifting in from
      // wherever it was last parked.
      smoothX = targetX;
      smoothY = targetY;
      touchActive = true;
      // `eikon-footer-light-active` flips touch-action / user-select /
      // -webkit-touch-callout off on the footer (see footer.css) — turns
      // the gesture into a pure light-control surface. Owned by React
      // state for the same reason as `eikon-footer-gyro` above.
      setLightActive(true);
      startTick();
    };

    const endGesture = () => {
      cancelPressTimer();
      if (touchActive) {
        touchActive = false;
        touchEndedAt = performance.now();
        setLightActive(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        // Multi-touch (pinch zoom etc.): cancel any pending press, let
        // the browser handle its native gesture.
        cancelPressTimer();
        return;
      }
      const t = e.touches[0];
      pressStartX = t.clientX;
      pressStartY = t.clientY;
      cancelPressTimer();
      pressTimer = window.setTimeout(() => {
        pressTimer = null;
        beginGesture(pressStartX, pressStartY);
      }, LONG_PRESS_MS);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (touchActive) {
        // Active gesture — block scroll, drive spotlight.
        e.preventDefault();
        setTargetFromClient(t.clientX, t.clientY);
      } else if (pressTimer !== null) {
        // Pre-gesture: if the finger moves enough before the long-press
        // timer fires, treat it as a scroll attempt and abandon.
        const dx = t.clientX - pressStartX;
        const dy = t.clientY - pressStartY;
        if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
          cancelPressTimer();
        }
      }
    };

    const handleTouchEnd = () => {
      endGesture();
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (touchActive) return;
      if (performance.now() - touchEndedAt < TOUCH_GYRO_HOLDOFF_MS) return;
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 55;
      targetX = clamp((gamma + 25) / 50, 0, 1);
      targetY = clamp((beta - 40) / 30, 0, 1);
      startTick();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    // touchmove is non-passive: we need preventDefault during active
    // long-press to suppress the page's native scroll.
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // iOS 13+ requires permission from a user gesture. Some iOS contexts
    // (insecure HTTP origin, Lockdown mode, certain in-app browsers) drop
    // the `DeviceOrientationEvent` global entirely — accessing it directly
    // there throws a ReferenceError, which previously crashed the whole
    // useEffect and unmounted the page (black screen). `typeof` is the
    // only safe way to probe for an undeclared global. If gyro is
    // unavailable, touch input alone drives the spotlight.
    type DOEStatic = { requestPermission?: () => Promise<string> } | null;
    const DOE: DOEStatic =
      typeof DeviceOrientationEvent !== 'undefined'
        ? (DeviceOrientationEvent as unknown as DOEStatic)
        : null;

    let gyroSubscribed = false;
    const subscribeGyro = () => {
      if (gyroSubscribed) return;
      gyroSubscribed = true;
      window.addEventListener('deviceorientation', handleOrientation);
    };

    if (DOE === null) {
      // Skip gyro entirely — touch handlers above already handle input.
    } else if (typeof DOE.requestPermission === 'function') {
      const handleTapForPermission = () => {
        DOE
          .requestPermission!()
          .then((state: string) => {
            if (state === 'granted') subscribeGyro();
          })
          .catch(() => {});
      };
      el.addEventListener('touchstart', handleTapForPermission, { once: true });
    } else {
      // Android / other — check if events actually fire
      const probe = (e: DeviceOrientationEvent) => {
        if (e.gamma !== null) {
          window.removeEventListener('deviceorientation', probe);
          subscribeGyro();
        }
      };
      window.addEventListener('deviceorientation', probe);
    }

    // Pause the rAF loop when the footer is off-screen (battery).
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting;
        if (inViewport && activated) {
          startTick();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelPressTimer();
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
