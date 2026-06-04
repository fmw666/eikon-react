/**
 * @file HeroBackdrop.tsx
 * @description Internal Hero piece — the two purely-decorative background
 * layers that sit behind the hero text column. Kept as a sibling of Hero.tsx
 * (not in any feature barrel) so it stays a private implementation detail.
 *
 *   1. A single faint grid pattern (CSS repeating-linear-gradient, no
 *      extra asset) anchored to the top-left and masked with a radial
 *      gradient so it only registers as a backdrop behind the slogan
 *      and dissolves to nothing before reaching the CTAs or the right
 *      side. We deliberately dropped the previous aurora-wash + mouse-
 *      spotlight stack: a quieter hero reads as more "editorial" and
 *      stops the visitor's eye competing between three pulsing layers.
 *   2. A free-floating, blurred `webicon.svg` glow anchored to the
 *      top-right, masked top-and-center so it fades into the surface
 *      rather than reading as a hard logo cut-out.
 */

import { type CSSProperties } from 'react';

export function HeroBackdrop() {
  return (
    <>
      {/* Grid backdrop — anchored to the content container so its
          mask coordinates align with the text's left edge. */}
      <div
        aria-hidden="true"
        className="eikon-grid-drift pointer-events-none absolute -left-16 inset-y-0 right-0 -z-10"
        style={
          {
            backgroundImage: `
              radial-gradient(circle 1.5px at center, var(--border-2) 0%, transparent 100%),
              linear-gradient(to right, var(--border-2) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border-2) 1px, transparent 1px)
            `.trim(),
            backgroundSize: '48px 48px',
            maskImage:
              'radial-gradient(ellipse 45% 60% at 5% 45%, black 15%, transparent 65%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 45% 60% at 5% 45%, black 15%, transparent 65%)',
            opacity: 0.6,
            '--eikon-grid-step': '40px',
          } as CSSProperties
        }
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-16 -z-10 hidden h-28 w-60 opacity-70 sm:block md:right-4 md:top-20 md:h-32 md:w-64 lg:right-[4.5rem] lg:top-24 lg:h-36 lg:w-72 xl:right-[6.5rem] xl:top-24 xl:h-40 xl:w-80"
        style={
          {
            maskImage:
              'linear-gradient(to bottom, black 0%, black 44%, rgb(0 0 0 / 0.48) 62%, transparent 82%), radial-gradient(ellipse at 55% 50%, black 0%, black 58%, rgb(0 0 0 / 0.58) 74%, transparent 90%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 0%, black 44%, rgb(0 0 0 / 0.48) 62%, transparent 82%), radial-gradient(ellipse at 55% 50%, black 0%, black 58%, rgb(0 0 0 / 0.58) 74%, transparent 90%)',
          } as CSSProperties
        }
      >
        <div className="absolute inset-x-4 inset-y-1 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgb(247_205_141/0.15),transparent_72%)] blur-2xl dark:bg-[radial-gradient(ellipse_at_center,rgb(247_205_141/0.12),transparent_72%)]" />
        <img
          src="/webicon.svg"
          alt=""
          className="relative h-full w-full rotate-[-7deg] object-contain opacity-85 mix-blend-screen drop-shadow-[0_20px_34px_rgb(247_205_141/0.14)] dark:drop-shadow-[0_20px_34px_rgb(247_205_141/0.1)]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent via-[var(--surface-0)]/45 to-[var(--surface-0)]" />
      </div>
    </>
  );
}
