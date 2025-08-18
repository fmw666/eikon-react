/**
 * @file cn.ts
 * @description Utility function to combine class names
 * @author fmw666@github
 * @date 2025-07-24
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to combine class names
 * @param inputs - Array of class names or objects
 * @returns Combined class string
 */

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}
