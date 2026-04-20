import { Router } from 'express';
import type { HealthController } from '../controllers/HealthController.js';

export function createHealthRouter(controller: HealthController): Router {
  const router = Router();
  router.get('/health', controller.handleGetHealth.bind(controller));
  return router;
}
