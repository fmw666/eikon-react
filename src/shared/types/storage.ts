/**
 * @file storage.ts
 * @description Storage type definitions
 * @author fmw666@github
 * @date 2025-07-22
 */

import { STORAGE_KEYS } from '@/shared/constants/storage';

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
