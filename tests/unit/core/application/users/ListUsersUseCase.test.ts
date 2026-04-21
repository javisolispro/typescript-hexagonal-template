import { describe, expect, it } from 'vitest';
import { ListUsersUseCase } from '../../../../../src/core/application/users/ListUsersUseCase.js';
import { User } from '../../../../../src/core/domain/users/User.js';
import type { LogContext, LoggerPort } from '../../../../../src/core/ports/LoggerPort.js';
import type { UserRepositoryPort } from '../../../../../src/core/ports/UserRepositoryPort.js';

class FakeLogger implements LoggerPort {
  readonly calls: Array<{
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    context?: LogContext;
  }> = [];
  info(message: string, context?: LogContext): void {
    this.calls.push({ level: 'info', message, context });
  }
  warn(message: string, context?: LogContext): void {
    this.calls.push({ level: 'warn', message, context });
  }
  error(message: string, context?: LogContext): void {
    this.calls.push({ level: 'error', message, context });
  }
  debug(message: string, context?: LogContext): void {
    this.calls.push({ level: 'debug', message, context });
  }
}

class FakeUserRepository implements UserRepositoryPort {
  constructor(private readonly users: readonly User[]) {}
  async listUsers(): Promise<readonly User[]> {
    return this.users;
  }
}

describe('ListUsersUseCase', () => {
  it('returns the users produced by the repository', async () => {
    const expected = [
      new User(1, 'a@b.com', 'A', 'B', 'https://example.com/a.png'),
      new User(2, 'c@d.com', 'C', 'D', 'https://example.com/c.png'),
    ];
    const sut = new ListUsersUseCase(new FakeUserRepository(expected), new FakeLogger());

    const result = await sut.execute();

    expect(result).toEqual(expected);
  });

  it('logs an info message each time it is executed', async () => {
    const logger = new FakeLogger();
    const sut = new ListUsersUseCase(new FakeUserRepository([]), logger);

    await sut.execute();

    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]).toMatchObject({ level: 'info', message: 'listing users' });
  });
});
