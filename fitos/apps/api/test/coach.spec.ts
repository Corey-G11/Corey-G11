import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CoachService } from '../src/coach/coach.service';
import { createMockPool } from './helpers/mock-pool';

describe('CoachService (integration, mocked pool)', () => {
  describe('submitFeedback', () => {
    it('persists a feedback event with a learned delta and maps the row', async () => {
      const mock = createMockPool([
        { rows: [{ user_id: 'u1' }] }, // ownership check
        {
          rows: [
            {
              id: 'f1',
              recommendation_id: 'r1',
              adherence_score: '0.30',
              subjective_energy_score: 2,
              user_rejection_reason: 'too hungry',
              system_learned_weight_delta: '-0.65',
            },
          ],
        }, // insert feedback_events
      ]);
      const service = new CoachService(mock.pool);

      const fb = await service.submitFeedback('u1', 'r1', {
        adherenceScore: 0.3,
        subjectiveEnergyScore: 2,
        userRejectionReason: 'too hungry',
      });

      expect(fb.id).toBe('f1');
      expect(fb.recommendationId).toBe('r1');
      expect(fb.adherenceScore).toBe(0.3);
      expect(fb.systemLearnedWeightDelta).toBe(-0.65);

      // The insert receives a computed (negative) learned delta as $5.
      const insert = mock.calls[1];
      expect(insert.params[0]).toBe('r1');
      expect(insert.params[3]).toBe('too hungry');
      expect(insert.params[4] as number).toBeLessThan(0);
    });

    it('blanks an empty rejection reason to null', async () => {
      const mock = createMockPool([
        { rows: [{ user_id: 'u1' }] },
        {
          rows: [
            {
              id: 'f2',
              recommendation_id: 'r1',
              adherence_score: '0.90',
              subjective_energy_score: null,
              user_rejection_reason: null,
              system_learned_weight_delta: '0.15',
            },
          ],
        },
      ]);
      const service = new CoachService(mock.pool);

      await service.submitFeedback('u1', 'r1', {
        adherenceScore: 0.9,
        userRejectionReason: '   ',
      });

      const insert = mock.calls[1];
      expect(insert.params[2]).toBeNull(); // energy
      expect(insert.params[3]).toBeNull(); // rejection reason
    });

    it('rejects feedback on a recommendation owned by someone else', async () => {
      const mock = createMockPool([{ rows: [{ user_id: 'someone-else' }] }]);
      const service = new CoachService(mock.pool);

      await expect(
        service.submitFeedback('u1', 'r1', { adherenceScore: 0.5 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws when the recommendation does not exist', async () => {
      const mock = createMockPool([{ rows: [] }]);
      const service = new CoachService(mock.pool);

      await expect(
        service.submitFeedback('u1', 'missing', { adherenceScore: 0.5 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('generate', () => {
    it('folds the learned factor into the recommendation', async () => {
      const mock = createMockPool([
        { rows: [{ primary_goal: 'lose_fat', daily_calorie_target: '2000' }] }, // active goal
        {
          rows: [
            { weight_kg: '80', recorded_at: new Date('2026-01-01T00:00:00Z') },
            { weight_kg: '80.1', recorded_at: new Date('2026-01-10T00:00:00Z') },
          ],
        }, // weights (flat trend)
        { rows: [{ learned_factor: '-0.5' }] }, // accumulated learned factor
        {
          rows: [
            {
              id: 'r9',
              generated_at: new Date('2026-01-11T00:00:00Z'),
              metric_snapshot: {},
              recommended_action: {},
              is_acknowledged: false,
              acknowledged_at: null,
            },
          ],
        }, // insert recommendation
      ]);
      const service = new CoachService(mock.pool);

      await service.generate('u1');

      // The insert is the 4th query; its action ($3) should reflect a gentled
      // cut: base -150 * (1 - 0.5) = -75 kcal.
      const insert = mock.calls[3];
      const action = JSON.parse(insert.params[2] as string);
      expect(action.suggestedCalorieAdjustment).toBe(-75);

      const snapshot = JSON.parse(insert.params[1] as string);
      expect(snapshot.learnedFactor).toBe(-0.5);
      expect(snapshot.trend).toBe('flat');
    });
  });
});
