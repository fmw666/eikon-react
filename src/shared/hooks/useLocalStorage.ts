/**
 * @file useLocalStorage.ts
 * @description Custom hook for managing localStorage with type safety and error handling
 * @author fmw666@github
 */

import { useState, useEffect, useCallback } from 'react';

import type { StorageKey } from '@/shared/types/storage';

// =================================================================================================
// Types
// =================================================================================================

/**
 * Options for useLocalStorage hook
 */
export interface UseLocalStorageOptions {
  /** Whether to serialize/deserialize the value (default: true) */
  serialize?: boolean;
  /** Custom serializer function */
  serializer?: (value: any) => string;
  /** Custom deserializer function */
  deserializer?: (value: string) => any;
  /** Whether to log errors to console (default: true) */
  logErrors?: boolean;
}

/**
 * Return type for useLocalStorage hook
 */
export type UseLocalStorageReturn<T> = [
  T,
  (value: T | ((val: T) => T)) => void,
  () => void // remove function
];

// =================================================================================================
// Utilities
// =================================================================================================

/**
 * Check if localStorage is available
 */
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Default serializer
 */
const defaultSerializer = <T>(value: T): string => {
  return JSON.stringify(value);
};

/**
 * Default deserializer
 */
const defaultDeserializer = <T>(value: string): T => {
  return JSON.parse(value);
};

// =================================================================================================
// Hook Implementation
// =================================================================================================

/**
 * Custom hook for managing localStorage with type safety
 * 
 * @template T - The type of the stored value
 * @param key - The localStorage key
 * @param initialValue - The initial value if no value exists in localStorage
 * @param options - Configuration options
 * @returns A tuple containing [value, setValue, removeValue]
 * 
 * @example
 * ```tsx
 * const [user, setUser, removeUser] = useLocalStorage('user', { name: 'John' });
 * 
 * // Update value
 * setUser({ name: 'Jane' });
 * 
 * // Update using function
 * setUser(prev => ({ ...prev, age: 25 }));
 * 
 * // Remove value
 * removeUser();
 * ```
 */
export function useLocalStorage<T>(
  key: StorageKey | string,
  initialValue: T,
  options: UseLocalStorageOptions = {}
): UseLocalStorageReturn<T> {
  const {
    serialize = true,
    serializer = defaultSerializer,
    deserializer = defaultDeserializer,
    logErrors = true,
  } = options;

  // Check if localStorage is available
  const storageAvailable = isLocalStorageAvailable();

  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!storageAvailable) {
      if (logErrors) {
        console.warn(`useLocalStorage: localStorage is not available for key "${key}"`);
      }
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }

      if (serialize) {
        return deserializer(item);
      }

      return item as T;
    } catch (error) {
      if (logErrors) {
        console.error(`useLocalStorage: Error reading localStorage key "${key}":`, error);
      }
      return initialValue;
    }
  });

  // Set value function
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    if (!storageAvailable) {
      if (logErrors) {
        console.warn(`useLocalStorage: Cannot set value for key "${key}" - localStorage not available`);
      }
      return;
    }

    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save to state
      setStoredValue(valueToStore);
      
      // Save to localStorage
      if (serialize) {
        window.localStorage.setItem(key, serializer(valueToStore));
      } else {
        window.localStorage.setItem(key, String(valueToStore));
      }
    } catch (error) {
      if (logErrors) {
        console.error(`useLocalStorage: Error setting localStorage key "${key}":`, error);
      }
    }
  }, [key, storedValue, storageAvailable, serialize, serializer, logErrors]);

  // Remove value function
  const removeValue = useCallback(() => {
    if (!storageAvailable) {
      if (logErrors) {
        console.warn(`useLocalStorage: Cannot remove value for key "${key}" - localStorage not available`);
      }
      return;
    }

    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      if (logErrors) {
        console.error(`useLocalStorage: Error removing localStorage key "${key}":`, error);
      }
    }
  }, [key, initialValue, storageAvailable, logErrors]);

  // Sync with other tabs/windows
  useEffect(() => {
    if (!storageAvailable) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = serialize ? deserializer(e.newValue) : e.newValue as T;
          setStoredValue(newValue);
        } catch (error) {
          if (logErrors) {
            console.error(`useLocalStorage: Error syncing localStorage key "${key}":`, error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, storageAvailable, serialize, deserializer, logErrors]);

  return [storedValue, setValue, removeValue];
}

// =================================================================================================
// Convenience Hooks
// =================================================================================================

/**
 * Convenience hook for boolean localStorage values
 */
export function useLocalStorageBoolean(
  key: StorageKey | string,
  initialValue: boolean = false
): UseLocalStorageReturn<boolean> {
  return useLocalStorage(key, initialValue);
}

/**
 * Convenience hook for string localStorage values
 */
export function useLocalStorageString(
  key: StorageKey | string,
  initialValue: string = ''
): UseLocalStorageReturn<string> {
  return useLocalStorage(key, initialValue, { serialize: false });
}

/**
 * Convenience hook for number localStorage values
 */
export function useLocalStorageNumber(
  key: StorageKey | string,
  initialValue: number = 0
): UseLocalStorageReturn<number> {
  return useLocalStorage(key, initialValue);
}
