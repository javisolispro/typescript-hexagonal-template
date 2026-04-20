import type { Request, Response, NextFunction } from 'express';
import type { CheckHealthUseCase } from '../../../core/application/health/CheckHealthUseCase.js';
import { HealthResponseSchema, type HealthResponse } from '../schemas/healthSchemas.js';

export class HealthController {
  constructor(private readonly useCase: CheckHealthUseCase) {}

  handleGetHealth(_req: Request, res: Response, next: NextFunction): void {
    try {
      const status = this.useCase.execute();
      const body: HealthResponse = HealthResponseSchema.parse({
        status: status.status,
        timestamp: status.timestamp.toISOString(),
        uptimeSeconds: status.uptimeSeconds,
      });
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
