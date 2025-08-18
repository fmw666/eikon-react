import type { User } from '@/features/auth';

interface MockUser extends User {
  password: string;
  token: string;
}

export const mockUser: MockUser = {
  id: 'u1',
  name: 'Test User',
  email: 'test@test.com',
  user_metadata: {
    display_name: 'Test User',
    hide_model_info: false,
  },
  password: '123456',
  token: 'user_token'
};
