/** Model bazen ```json ... ``` ile sarar; güvenli parse. */
export function parseJsonFromAssistant(raw: string): unknown {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const jsonStr = fence ? fence[1].trim() : t;
  return JSON.parse(jsonStr) as unknown;
}
