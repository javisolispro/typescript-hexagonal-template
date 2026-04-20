import { HealthStatus } from '../../domain/health/HealthStatus.js';
import type { LoggerPort } from '../../ports/LoggerPort.js';

export class CheckHealthUseCase {
  constructor(private readonly logger: LoggerPort) {}

  execute(): HealthStatus {
    this.logger.info('health check requested');
    return new HealthStatus('ok', new Date(), process.uptime());
  }
}
