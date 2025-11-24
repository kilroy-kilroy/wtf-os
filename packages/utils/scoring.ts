/**
 * Scoring utilities for Call Lab
 */

/**
 * Convert a 1-5 score to a letter grade
 */
export function scoreToGrade5(score: number): string {
  if (score >= 4.5) return 'A';
  if (score >= 3.5) return 'B';
  if (score >= 2.5) return 'C';
  if (score >= 1.5) return 'D';
  return 'F';
}

/**
 * Convert a 1-10 score to a letter grade
 */
export function scoreToGrade10(score: number): string {
  if (score >= 9) return 'A+';
  if (score >= 8.5) return 'A';
  if (score >= 8) return 'A-';
  if (score >= 7.5) return 'B+';
  if (score >= 7) return 'B';
  if (score >= 6.5) return 'B-';
  if (score >= 6) return 'C+';
  if (score >= 5.5) return 'C';
  if (score >= 5) return 'C-';
  if (score >= 4) return 'D';
  return 'F';
}

/**
 * Calculate average score from a scores object
 */
export function calculateAverageScore(
  scores: Record<string, { score: number }>
): number {
  const values = Object.values(scores).map((s) => s.score);
  if (values.length === 0) return 0;
  return values.reduce((sum, score) => sum + score, 0) / values.length;
}

/**
 * Normalize a score to 0-1 range
 */
export function normalizeScore(score: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (score - min) / (max - min)));
}

/**
 * Calculate weighted average
 */
export function weightedAverage(
  scores: Array<{ value: number; weight: number }>
): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = scores.reduce(
    (sum, s) => sum + s.value * s.weight,
    0
  );
  return weightedSum / totalWeight;
}

/**
 * Get color class for a score (for UI)
 */
export function getScoreColor(score: number, max: number = 5): string {
  const normalized = score / max;
  if (normalized >= 0.8) return 'text-green-600';
  if (normalized >= 0.6) return 'text-blue-600';
  if (normalized >= 0.4) return 'text-yellow-600';
  if (normalized >= 0.2) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get background color class for a score (for UI)
 */
export function getScoreBgColor(score: number, max: number = 5): string {
  const normalized = score / max;
  if (normalized >= 0.8) return 'bg-green-100';
  if (normalized >= 0.6) return 'bg-blue-100';
  if (normalized >= 0.4) return 'bg-yellow-100';
  if (normalized >= 0.2) return 'bg-orange-100';
  return 'bg-red-100';
}
