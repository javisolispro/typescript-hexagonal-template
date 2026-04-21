import { Router } from 'express';
import type { UsersController } from '../controllers/UsersController.js';

export function createUsersRouter(controller: UsersController): Router {
  const router = Router();
  router.get('/users', controller.handleListUsers.bind(controller));
  return router;
}
