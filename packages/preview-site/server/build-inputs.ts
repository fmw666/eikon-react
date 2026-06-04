/**
 * @file build-inputs.ts
 * @description Request-body normalization for the `/api/build` handler.
 * Internal to the handlers layer — splits the param-coercion concern out
 * of `handlers.ts` so that file reads as pure routing.
 */

import { DEFAULT_INPUTS } from './builder';
import { type BuildInputs } from './hash';

export interface BuildRequestBody {
  platform?: string;
  supabase?: boolean;
  pm?: string;
  design?: string;
  layout?: string;
  ui?: string;
  toastPosition?: string;
}

/**
 * Coerce a loosely-typed `/api/build` JSON body into a fully-populated
 * `BuildInputs`, filling any missing axis from `DEFAULT_INPUTS`. Every
 * value is stringified (except `supabase`, a tri-state boolean) so a
 * crafted body of numbers / nulls can't smuggle a non-string into the
 * hash + strip pipeline downstream.
 */
export function normalizeInputs(body: BuildRequestBody): BuildInputs {
  return {
    platform: String(body.platform ?? DEFAULT_INPUTS.platform),
    supabase:
      body.supabase === undefined ? DEFAULT_INPUTS.supabase : !!body.supabase,
    pm: String(body.pm ?? DEFAULT_INPUTS.pm),
    design: String(body.design ?? DEFAULT_INPUTS.design),
    layout: String(body.layout ?? DEFAULT_INPUTS.layout),
    ui: String(body.ui ?? DEFAULT_INPUTS.ui),
    toastPosition: String(body.toastPosition ?? DEFAULT_INPUTS.toastPosition),
  };
}
