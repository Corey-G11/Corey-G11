import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkoutsService } from '../src/workouts/workouts.service';
import { createMockPool } from './helpers/mock-pool';

describe('WorkoutsService (integration, mocked pool)', () => {
  it('createProgram inserts the program and its scheduled days in a transaction', async () => {
    const mock = createMockPool([
      {
        rows: [
          {
            id: 'p1',
            user_id: 'u1',
            name: 'My Split',
            duration_weeks: 4,
            is_active: false,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
      { rows: [{ id: 'd1', program_id: 'p1', day_number: 1, name: 'A' }] },
      { rows: [{ id: 'd2', program_id: 'p1', day_number: 2, name: 'B' }] },
    ]);
    const service = new WorkoutsService(mock.pool);

    const program = await service.createProgram('u1', {
      name: 'My Split',
      durationWeeks: 4,
      days: [
        { dayNumber: 1, name: 'A' },
        { dayNumber: 2, name: 'B' },
      ],
    });

    expect(program.id).toBe('p1');
    expect(program.scheduled_workouts).toHaveLength(2);
    expect(program.scheduled_workouts.map((d) => d.name)).toEqual(['A', 'B']);
  });

  it('addSet rejects logging onto another user\'s workout log', async () => {
    const mock = createMockPool([
      { rows: [{ id: 'l1', user_id: 'someone-else' }] }, // getOwnedLog
    ]);
    const service = new WorkoutsService(mock.pool);

    await expect(
      service.addSet('u1', 'l1', {
        exerciseId: 'e1',
        setIndex: 1,
        actualReps: 8,
        weightKg: 100,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('addSet throws NotFound when the workout log does not exist', async () => {
    const mock = createMockPool([{ rows: [] }]);
    const service = new WorkoutsService(mock.pool);

    await expect(
      service.addSet('u1', 'missing', {
        exerciseId: 'e1',
        setIndex: 1,
        actualReps: 8,
        weightKg: 100,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listLogs returns the user\'s logs', async () => {
    const mock = createMockPool([
      {
        rows: [
          { id: 'l1', user_id: 'u1', status: 'completed' },
          { id: 'l2', user_id: 'u1', status: 'pending' },
        ],
      },
    ]);
    const service = new WorkoutsService(mock.pool);

    const logs = await service.listLogs('u1');
    expect(logs).toHaveLength(2);
    expect(mock.calls[0].params).toEqual(['u1']);
  });
});
