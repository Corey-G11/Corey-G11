import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NutritionService } from '../src/nutrition/nutrition.service';
import { createMockPool } from './helpers/mock-pool';

describe('NutritionService (integration, mocked pool)', () => {
  it('createLog throws NotFound when the food does not exist', async () => {
    const mock = createMockPool([{ rows: [], rowCount: 0 }]);
    const service = new NutritionService(mock.pool);

    await expect(
      service.createLog('u1', { foodId: 'missing', mealIndex: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getSummary sums consumed macros and computes remaining vs targets', async () => {
    const mock = createMockPool([
      {
        rows: [{ calories: '1000', protein: '50', carbs: '100', fat: '30' }],
      },
      {
        rows: [
          {
            daily_calorie_target: 2000,
            protein_target_g: 150,
            carbohydrate_target_g: 200,
            fat_target_g: 60,
          },
        ],
        rowCount: 1,
      },
    ]);
    const service = new NutritionService(mock.pool);

    const summary = await service.getSummary('u1', '2026-06-23');
    expect(summary.consumed).toEqual({
      calories: 1000,
      proteinG: 50,
      carbsG: 100,
      fatG: 30,
    });
    expect(summary.targets).toEqual({
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    expect(summary.remaining).toEqual({
      calories: 1000,
      proteinG: 100,
      carbsG: 100,
      fatG: 30,
    });
  });

  it('getSummary returns null targets when there is no active goal', async () => {
    const mock = createMockPool([
      { rows: [{ calories: '0', protein: '0', carbs: '0', fat: '0' }] },
      { rows: [], rowCount: 0 },
    ]);
    const service = new NutritionService(mock.pool);

    const summary = await service.getSummary('u1');
    expect(summary.targets).toBeNull();
    expect(summary.remaining).toBeNull();
  });

  it('deleteLog rejects deleting another user\'s log', async () => {
    const mock = createMockPool([
      { rows: [{ user_id: 'someone-else' }], rowCount: 1 },
    ]);
    const service = new NutritionService(mock.pool);

    await expect(service.deleteLog('u1', 'log-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('deleteLog throws NotFound for a missing log', async () => {
    const mock = createMockPool([{ rows: [], rowCount: 0 }]);
    const service = new NutritionService(mock.pool);

    await expect(service.deleteLog('u1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
