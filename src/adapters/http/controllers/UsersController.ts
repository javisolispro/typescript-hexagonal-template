import type { NextFunction, Request, Response } from 'express';
import type { ListUsersUseCase } from '../../../core/application/users/ListUsersUseCase.js';
import { type ListUsersResponse, ListUsersResponseSchema } from '../schemas/usersSchemas.js';

export class UsersController {
  constructor(private readonly useCase: ListUsersUseCase) {}

  async handleListUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.useCase.execute();
      const body: ListUsersResponse = ListUsersResponseSchema.parse({
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          avatarUrl: u.avatarUrl,
        })),
      });
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
