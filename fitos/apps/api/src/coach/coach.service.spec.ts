import {
  applyLearning,
  buildRecommendedAction,
  computeLearnedWeightDelta,
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

    it('a negative learned factor gentles an aggressive cut', () => {
      // base -150 kcal, factor -0.5 → multiplier 0.5 → -75 kcal
      const action = buildRecommendedAction('lose_fat', 'flat', -0.5);
      expect(action.suggestedCalorieAdjustment).toBe(-75);
    });

    it('a positive learned factor amplifies an adjustment', () => {
      // base +150 kcal, factor +0.3 → multiplier 1.3 → 195 kcal
      const action = buildRecommendedAction('build_muscle', 'flat', 0.3);
      expect(action.suggestedCalorieAdjustment).toBe(195);
    });

    it('learning never flips a zero-adjustment plan', () => {
      const action = buildRecommendedAction('lose_fat', 'down', -0.8);
      expect(action.suggestedCalorieAdjustment).toBe(0);
    });
  });

  describe('computeLearnedWeightDelta', () => {
    it('dampens after poor adherence', () => {
      const delta = computeLearnedWeightDelta({
        adherenceScore: 0.2,
        subjectiveEnergyScore: null,
        hasRejection: false,
      });
      expect(delta).toBeLessThan(0);
    });

    it('rewards strong adherence with good energy', () => {
      const delta = computeLearnedWeightDelta({
        adherenceScore: 0.9,
        subjectiveEnergyScore: 5,
        hasRejection: false,
      });
      expect(delta).toBeGreaterThan(0);
    });

    it('treats an explicit rejection as the strongest back-off signal', () => {
      const withRejection = computeLearnedWeightDelta({
        adherenceScore: 0.9,
        subjectiveEnergyScore: 4,
        hasRejection: true,
      });
      const withoutRejection = computeLearnedWeightDelta({
        adherenceScore: 0.9,
        subjectiveEnergyScore: 4,
        hasRejection: false,
      });
      expect(withRejection).toBeLessThan(withoutRejection);
    });

    it('clamps the delta to [-1, 1]', () => {
      const worst = computeLearnedWeightDelta({
        adherenceScore: 0,
        subjectiveEnergyScore: 1,
        hasRejection: true,
      });
      expect(worst).toBeGreaterThanOrEqual(-1);
      expect(worst).toBeLessThanOrEqual(1);
    });
  });

  describe('applyLearning', () => {
    it('is a no-op for a zero base or zero factor', () => {
      expect(applyLearning(0, 0.5)).toBe(0);
      expect(applyLearning(-150, 0)).toBe(-150);
    });

    it('clamps the multiplier so an adjustment is never erased', () => {
      // factor -5 would zero it out; multiplier floors at 0.25 → -150*0.25
      // = -37.5, rounded to the nearest 5 kcal.
      expect(applyLearning(-150, -5)).toBe(-35);
    });

    it('clamps the multiplier at 1.5x', () => {
      expect(applyLearning(100, 5)).toBe(150);
    });
  });
});
