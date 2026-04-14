export function parsePositiveIntegerParam(
  value: string | null,
  fallback: number,
  {
    min = 1,
    max,
  }: {
    min?: number;
    max?: number;
  } = {},
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const bounded = Math.max(min, parsed);
  return typeof max === "number" ? Math.min(max, bounded) : bounded;
}
