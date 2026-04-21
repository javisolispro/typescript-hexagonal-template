import { Router } from 'express';
import type { HelloWorldController } from '../controllers/HelloWorldController.js';

export function createHelloWorldRouter(controller: HelloWorldController): Router {
  const router = Router();
  router.get('/hello-world', controller.handleGetHelloWorld.bind(controller));
  return router;
}
