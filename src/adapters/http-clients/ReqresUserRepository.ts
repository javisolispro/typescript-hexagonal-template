import { ZodError } from 'zod';
import { User } from '../../core/domain/users/User.js';
import type { LoggerPort } from '../../core/ports/LoggerPort.js';
import type { UserRepositoryPort } from '../../core/ports/UserRepositoryPort.js';
import { ReqresListUsersResponseSchema } from './reqresSchemas.js';
import { UpstreamHttpError } from './UpstreamHttpError.js';

export interface ReqresUserRepositoryOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
}

export class ReqresUserRepository implements UserRepositoryPort {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(
    private readonly opts: ReqresUserRepositoryOptions,
    private readonly logger: LoggerPort,
  ) {
    this.fetchFn = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? 5000;
  }

  async listUsers(): Promise<readonly User[]> {
    const url = `${this.opts.baseUrl}/api/users`;
    const res = await this.fetchFn(url, {
      headers: {
        'x-api-key': this.opts.apiKey,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      this.logger.warn('reqres upstream non-2xx', { status: res.status, url });
      throw new UpstreamHttpError(`reqres ${res.status}`, res.status);
    }

    const json = (await res.json()) as unknown;
    let parsed: ReturnType<typeof ReqresListUsersResponseSchema.parse>;
    try {
      parsed = ReqresListUsersResponseSchema.parse(json);
    } catch (err) {
      if (err instanceof ZodError) {
        this.logger.warn('reqres upstream schema drift', { url });
        throw new UpstreamHttpError('reqres response schema drift', undefined, err);
      }
      throw err;
    }

    return parsed.data.map((u) => new User(u.id, u.email, u.first_name, u.last_name, u.avatar));
  }
}
