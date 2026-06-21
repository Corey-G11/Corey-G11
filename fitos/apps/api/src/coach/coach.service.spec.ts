import {
  buildRecommendedAction,
  computeWeightTrend,
  WeightPoint,
} from './coach.logic';

function point(weightKg: number, daysAgo: number): WeightPoint {
  const recordedAt = new Date();
  recordedAt.setDate(recordedAt.getDate() - daysAgo);
  return { weightKg, recordedAt };
}

describe('coach logic', () => {
  describe('computeWeightTrend', () => {
    it('returns unknown with fewer than 2 points', () => {
      expect(computeWeightTrend([])).toBe('unknown');
      expect(computeWeightTrend([point(80, 0)])).toBe('unknown');
    });

    it('detects a downward trend', () => {
      const points = [point(82, 14), point(81, 7), point(80, 0)];
      expect(computeWeightTrend(points)).toBe('down');
    });

    it('detects an upward trend', () => {
      const points = [point(78, 14), point(79, 7), point(80, 0)];
      expect(computeWeightTrend(points)).toBe('up');
    });

    it('treats small changes as flat', () => {
      const points = [point(80, 14), point(80.2, 0)];
      expect(computeWeightTrend(points)).toBe('flat');
    });
  });

  describe('buildRecommendedAction', () => {
    it('lose_fat with no downward trend suggests a -150 kcal cut', () => {
      const action = buildRecommendedAction('lose_fat', 'flat');
      expect(action.suggestedCalorieAdjustment).toBe(-150);
    });

    it('lose_fat trending down is on track with no adjustment', () => {
      const action = buildRecommendedAction('lose_fat', 'down');
      expect(action.suggestedCalorieAdjustment).toBe(0);
    });

    it('build_muscle that is flat suggests a +150 kcal bump', () => {
      const action = buildRecommendedAction('build_muscle', 'flat');
      expect(action.suggestedCalorieAdjustment).toBe(150);
    });

    it('build_muscle trending up is on track with no adjustment', () => {
      const action = buildRecommendedAction('build_muscle', 'up');
      expect(action.suggestedCalorieAdjustment).toBe(0);
    });

    it('maintenance goal returns an encouraging zero-adjustment message', () => {
      const action = buildRecommendedAction('health_maintenance', 'up');
      expect(action.suggestedCalorieAdjustment).toBe(0);
      expect(action.message.length).toBeGreaterThan(0);
    });

    it('unknown goal/trend returns zero adjustment', () => {
      expect(buildRecommendedAction(null, 'unknown').suggestedCalorieAdjustment).toBe(
        0,
      );
    });
  });
});
