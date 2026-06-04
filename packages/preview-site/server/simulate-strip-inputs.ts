/**
 * @file simulate-strip-inputs.ts
 * @description Input normalisation for the strip simulator — keeps the
 * simulator and builder reading the same shape. Internal to
 * `simulate-strip.ts`; not part of the preview server's public surface.
 */

import {
  type FeatureFlags,
  type VariantSelections,
} from '../../create-eikon-react/src/strip-features';
import { type PackageManager } from '../../create-eikon-react/src/rewrite-package-manager';

import { type BuildInputs } from './hash';

export function flagsFromInputs(inputs: BuildInputs): FeatureFlags {
  return {
    supabase: !!inputs.supabase,
  };
}

export function variantsFromInputs(inputs: BuildInputs): VariantSelections {
  return {
    platform: inputs.platform,
    design: inputs.design,
    layout: inputs.layout,
    ui: inputs.ui,
    toastPosition: inputs.toastPosition,
  };
}

export function packageManagerFromInputs(inputs: BuildInputs): PackageManager {
  return inputs.pm === 'npm' || inputs.pm === 'bun' ? inputs.pm : 'pnpm';
}

export function disabledFeaturesFromFlags(flags: FeatureFlags): Set<string> {
  const disabled = new Set<string>();
  if (!flags.supabase) disabled.add('supabase');
  return disabled;
}
