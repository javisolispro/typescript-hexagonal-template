import { z } from 'zod';

const ReqresUserSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  avatar: z.string().url(),
});

export const ReqresListUsersResponseSchema = z.object({
  data: z.array(ReqresUserSchema),
});

export type ReqresListUsersResponse = z.infer<typeof ReqresListUsersResponseSchema>;
