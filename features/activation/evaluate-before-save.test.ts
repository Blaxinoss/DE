import { describe, expect, mock, test } from "bun:test";
import { evaluateBeforeSaving } from "./evaluate-before-save";

describe("activation persistence boundary", () => {
  test.each(["Gemini failed", "Gemini timed out"])(
    "does not save progress when evaluation rejects: %s",
    async (message) => {
      const failure = new Error(message);
      const evaluate = mock(async () => {
        throw failure;
      });
      const save = mock(async () => "saved");

      await expect(evaluateBeforeSaving(evaluate, save)).rejects.toThrow(
        failure.message,
      );

      expect(evaluate).toHaveBeenCalledTimes(1);
      expect(save).not.toHaveBeenCalled();
    },
  );

  test("passes a successful evaluation to persistence exactly once", async () => {
    const evaluation = { attempts: [] };
    const evaluate = mock(async () => evaluation);
    const save = mock(async (value: typeof evaluation) => ({
      count: value.attempts.length,
    }));

    const result = await evaluateBeforeSaving(evaluate, save);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(evaluation);
    expect(result).toEqual({ evaluation, saved: { count: 0 } });
  });
});
