import { describe, expect, test } from "bun:test";
import { extractGermanArticle } from "./word-identity";

describe("extractGermanArticle", () => {
  test.each([
    [{ article: "der" }, "der"],
    [{ article: " Die " }, "die"],
    [{ Article: "das (neuter)" }, "das"],
  ] as const)("normalizes generated and legacy article values", (grammar, expected) => {
    expect(extractGermanArticle(grammar)).toBe(expected);
  });

  test("does not invent an article when none is present", () => {
    expect(extractGermanArticle({ gender: "feminine" })).toBeNull();
  });
});
