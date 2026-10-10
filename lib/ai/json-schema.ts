import { z } from "zod";

export function toGeminiJsonSchema(schema: z.ZodType): unknown {
  const jsonSchema = z.toJSONSchema(schema);
  const allowed = new Set([
    "$id",
    "$defs",
    "$ref",
    "$anchor",
    "type",
    "format",
    "title",
    "description",
    "enum",
    "items",
    "prefixItems",
    "minItems",
    "maxItems",
    "minLength",
    "maxLength",
    "pattern",
    "minimum",
    "maximum",
    "anyOf",
    "oneOf",
    "properties",
    "additionalProperties",
    "required",
  ]);

  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(clean);
    if (!value || typeof value !== "object") return value;

    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => allowed.has(key))
        .map(([key, child]) => {
          if (
            (key === "properties" || key === "$defs") &&
            child &&
            typeof child === "object" &&
            !Array.isArray(child)
          ) {
            return [
              key,
              Object.fromEntries(
                Object.entries(child).map(([name, definition]) => [
                  name,
                  clean(definition),
                ]),
              ),
            ];
          }
          return [key, clean(child)];
        }),
    );
  };

  return clean(jsonSchema);
}
