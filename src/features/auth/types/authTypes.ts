export interface User {
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
