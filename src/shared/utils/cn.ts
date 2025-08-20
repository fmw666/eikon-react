/**
 * @file cn.ts
 * @description Utility function to combine class names
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { ClassValue } from 'clsx';

// =================================================================================================
// Functions
// =================================================================================================

/**
 * Utility function to combine class names
 * @param inputs - Array of class names or objects
 * @returns Combined class string
 */
const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

// =================================================================================================
// Exports
// =================================================================================================

export { cn };
