/**
 * @file authTypes.ts
 * @description Auth types
 * @author fmw666@github
 */

// =================================================================================================
// Types
// =================================================================================================

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  permissions?: string[];
  user_metadata?: {
    display_name?: string;
    [key: string]: string | boolean | undefined;
  };
}

// =================================================================================================
// Exports
// =================================================================================================

export type { User };
