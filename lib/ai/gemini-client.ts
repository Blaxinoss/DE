import "server-only";
import { GoogleGenAI } from "@google/genai";

export const geminiModel = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

let client: GoogleGenAI | undefined;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  client ??= new GoogleGenAI({ apiKey });
  return client;
}
