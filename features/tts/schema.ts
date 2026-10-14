import { z } from "zod";

export const speechRequestSchema = z.object({
  lexiconId: z.uuid(),
});

export const speechSuccessSchema = z.object({
  ok: z.literal(true),
  audioUrl: z.url(),
});

export const speechErrorSchema = z.object({
  ok: z.literal(false),
  code: z.enum([
    "invalid_request",
    "unauthorized",
    "not_found",
    "rate_limited",
    "unavailable",
  ]),
  message: z.string().min(1),
});

export const speechResponseSchema = z.discriminatedUnion("ok", [
  speechSuccessSchema,
  speechErrorSchema,
]);

export type SpeechRequest = z.infer<typeof speechRequestSchema>;
export type SpeechSuccess = z.infer<typeof speechSuccessSchema>;
export type SpeechError = z.infer<typeof speechErrorSchema>;
export type SpeechResponse = z.infer<typeof speechResponseSchema>;
