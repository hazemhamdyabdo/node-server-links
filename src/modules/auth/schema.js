import { z } from "zod";

export const registerSchema = z.object({
  body: {
    email: z.string().email(),
    password: z.string().min(6),
  },
});
export const loginSchema = z.object({
  body: {
    email: z.string().email(),
    password: z.string().min(6),
  },
});
