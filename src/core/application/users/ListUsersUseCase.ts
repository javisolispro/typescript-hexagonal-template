import type { User } from '../../domain/users/User.js';
import type { LoggerPort } from '../../ports/LoggerPort.js';
import type { UserRepositoryPort } from '../../ports/UserRepositoryPort.js';

export class ListUsersUseCase {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(): Promise<readonly User[]> {
    this.logger.info('listing users');
    return this.users.listUsers();
  }
}
