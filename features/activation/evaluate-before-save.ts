export async function evaluateBeforeSaving<Evaluation, Saved>(
  evaluate: () => Promise<Evaluation>,
  save: (evaluation: Evaluation) => Promise<Saved>,
): Promise<{ evaluation: Evaluation; saved: Saved }> {
  const evaluation = await evaluate();
  const saved = await save(evaluation);
  return { evaluation, saved };
}
