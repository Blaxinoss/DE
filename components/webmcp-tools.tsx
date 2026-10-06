"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Document { modelContext?: { registerTool(tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute(input: unknown): unknown }, options?: { signal?: AbortSignal }): void | Promise<void> } }
}

export function WebMcpTools() {
  const router = useRouter();
  useEffect(() => {
    if (!document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (name: string, title: string, description: string, path: string) => Promise.resolve(document.modelContext!.registerTool({ name, title, description, inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => { router.push(path); return { opened: path }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    void register("start_vocabulary_review", "Start vocabulary review", "Open the due-word retrieval review flow.", "/review");
    void register("start_activation_practice", "Start activation practice", "Open production practice for active-target German words.", "/activate");
    return () => lifecycle.abort();
  }, [router]);
  return null;
}
