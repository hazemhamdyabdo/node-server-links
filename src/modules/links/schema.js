import { z } from "zod";

export const createLink = z.object({
  body: z.object({
    url: z
      .string()
      .url()
      .refine(
        (val) => val.startsWith("http://") || val.startsWith("https://"),
        {
          error: "URL must use http or https",
        },
      ),
  }),
});
