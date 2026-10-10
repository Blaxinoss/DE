import { describe, expect, mock, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

mock.module("server-only", () => ({}));

const { consumeAiQuota } = await import("./quota");

type QuotaRpcResult = {
  data: boolean | null;
  error: { message: string } | null;
};

function quotaClient(result: QuotaRpcResult) {
  const rpc = mock(async () => result);

  return {
    client: { rpc } as unknown as SupabaseClient<Database>,
    rpc,
  };
}

describe("consumeAiQuota", () => {
  test("allows an AI operation when the database consumes one quota unit", async () => {
    const { client, rpc } = quotaClient({ data: true, error: null });

    await expect(consumeAiQuota(client, "activate")).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("consume_ai_quota", {
      p_action: "activate",
    });
  });

  test("stops the operation when the daily quota is exhausted", async () => {
    const { client } = quotaClient({ data: false, error: null });

    await expect(consumeAiQuota(client, "generate_word")).rejects.toThrow(
      "AI_DAILY_LIMIT_REACHED",
    );
  });

  test("does not treat a database failure as an exhausted quota", async () => {
    const { client } = quotaClient({
      data: null,
      error: { message: "Database unavailable" },
    });

    try {
      await consumeAiQuota(client, "activate");
      throw new Error("Expected the quota check to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("AI_QUOTA_CHECK_FAILED");
      expect((error as Error).cause).toEqual({
        message: "Database unavailable",
      });
    }
  });
});
