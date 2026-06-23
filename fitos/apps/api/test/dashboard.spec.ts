import { DashboardService } from '../src/dashboard/dashboard.service';
import { createMockPool } from './helpers/mock-pool';

describe('DashboardService (integration, mocked pool)', () => {
  it('createBiometric inserts and maps the returned row', async () => {
    const mock = createMockPool([
      {
        rows: [
          {
            id: 'b1',
            recorded_at: new Date('2026-01-01T00:00:00Z'),
            weight_kg: '80',
            body_fat_percentage: null,
            resting_heart_rate: null,
            sleep_duration_minutes: null,
          },
        ],
      },
    ]);
    const service = new DashboardService(mock.pool);

    const bio = await service.createBiometric('u1', { weightKg: 80 });
    expect(bio.id).toBe('b1');
    expect(bio.weightKg).toBe(80);
    expect(mock.calls[0].params[0]).toBe('u1');
    expect(mock.calls[0].params[1]).toBe(80);
  });

  it('getBiometrics maps rows and caps the limit', async () => {
    const mock = createMockPool([
      {
        rows: [
          {
            id: 'b1',
            recorded_at: new Date('2026-01-02T00:00:00Z'),
            weight_kg: '79.5',
            body_fat_percentage: '18',
            resting_heart_rate: 58,
            sleep_duration_minutes: 450,
          },
        ],
      },
    ]);
    const service = new DashboardService(mock.pool);

    const list = await service.getBiometrics('u1', 9999);
    expect(list).toHaveLength(1);
    expect(list[0].weightKg).toBe(79.5);
    // limit is clamped to 365
    expect(mock.calls[0].params[1]).toBe(365);
  });

  it('getSnapshot returns an empty snapshot when there is no data', async () => {
    // Query initiation order under Promise.all: goals, latest weight,
    // today calories, workouts, latest recommendation. With no weight, the
    // "oldest weight" follow-up query is never issued.
    const mock = createMockPool([
      { rows: [] }, // active goals
      { rows: [] }, // latest weight
      { rows: [{ total: '0' }] }, // today calories
      { rows: [{ count: '0' }] }, // workouts this week
      { rows: [] }, // latest recommendation
    ]);
    const service = new DashboardService(mock.pool);

    const snap = await service.getSnapshot('u1');
    expect(snap).toEqual({
      goals: null,
      latestWeightKg: null,
      weightDeltaKg: null,
      todayCalories: 0,
      workoutsThisWeek: 0,
      latestRecommendation: null,
    });
  });
});
