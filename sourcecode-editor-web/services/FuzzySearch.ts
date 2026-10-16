export function FuzzyScorePath(path: string, query: string): number | null {
  if (!query) return 0;
  const lowerPath = path.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let score = 0;
  let pathIndex = 0;
  let streak = 0;
  for (let i = 0; i < lowerQuery.length; i++) {
    const found = lowerPath.indexOf(lowerQuery[i], pathIndex);
    if (found === -1) return null;
    if (found === pathIndex) {
      streak++;
      score += 5 + streak;
    } else {
      streak = 0;
      score += 1;
    }
    if (found === 0 || "/._-".includes(lowerPath[found - 1])) {
      score += 4;
    }
    pathIndex = found + 1;
  }
  score += Math.max(0, 20 - path.length / 8);
  return score;
}

export function FuzzyFilterPaths(
  paths: string[],
  query: string,
  limit = 100
): string[] {
  if (!query) return paths.slice(0, limit);
  const scored: { path: string; score: number }[] = [];
  for (const path of paths) {
    const score = FuzzyScorePath(path, query);
    if (score !== null) {
      scored.push({ path, score });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return scored.slice(0, limit).map((entry) => entry.path);
}
