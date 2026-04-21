import type { NextFunction, Request, Response } from 'express';
import type { HelloWorldUseCase } from '../../../core/application/hello-world/HelloWorldUseCase.js';
import { type HelloWorldResponse, HelloWorldResponseSchema } from '../schemas/helloWorldSchemas.js';

export class HelloWorldController {
  constructor(private readonly useCase: HelloWorldUseCase) {}

  handleGetHelloWorld(_req: Request, res: Response, next: NextFunction): void {
    try {
      const response = this.useCase.execute();
      const body: HelloWorldResponse = HelloWorldResponseSchema.parse({
        message: response.message,
      });
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
