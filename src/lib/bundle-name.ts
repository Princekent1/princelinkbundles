export function deriveBundleName(volumeMb: number): string {
  const gb = volumeMb / 1024;
  return `${parseFloat(gb.toFixed(2))} GB`;
}

export function effectiveBundleName(bundle: { volumeMb: number; displayName?: string | null }): string {
  return bundle.displayName?.trim() || deriveBundleName(bundle.volumeMb);
}

export function formatValidity(days: number): string {
  if (days === 1) return "24 hours";
  if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? "s" : ""}`;
  if (days % 7 === 0) return `${days / 7} week${days / 7 > 1 ? "s" : ""}`;
  return `${days} days`;
}
