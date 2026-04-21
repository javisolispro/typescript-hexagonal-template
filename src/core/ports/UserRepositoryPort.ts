import type { User } from '../domain/users/User.js';

export interface UserRepositoryPort {
  listUsers(): Promise<readonly User[]>;
}
