import { OnboardingService } from '../src/onboarding/onboarding.service';
import { OnboardingDto } from '../src/onboarding/dto/onboarding.dto';
import { TdeeService } from '../src/tdee/tdee.service';
import { createMockPool } from './helpers/mock-pool';

const dto: OnboardingDto = {
  firstName: 'Al',
  dateOfBirth: '1994-01-01',
  gender: 'male',
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'moderate',
  primaryGoal: 'lose_fat',
  targetWeightKg: 75,
  trainingDaysPerWeek: 4,
  sessionMinutes: 60,
  injuries: [],
  foodLikes: [],
  foodDislikes: [],
  dietaryRules: [],
};

describe('OnboardingService (integration, mocked pool)', () => {
  it('persists profile, biometrics, and a fresh active goal, returning macros', async () => {
    const tdee = new TdeeService();
    const mock = createMockPool([
      { rows: [] }, // upsert profiles
      { rows: [] }, // insert biometrics_ledger
      { rows: [] }, // deactivate old goals
      { rows: [] }, // insert new active goal
    ]);
    const service = new OnboardingService(mock.pool, tdee);

    const macros = await service.completeOnboarding('user-1', dto);

    const expected = tdee.calculate({
      gender: dto.gender,
      weightKg: dto.weightKg,
      heightCm: dto.heightCm,
      dateOfBirth: dto.dateOfBirth,
      activityLevel: dto.activityLevel,
      primaryGoal: dto.primaryGoal,
    });
    expect(macros).toEqual(expected);

    const bio = mock.calls.find((c) => c.text.includes('biometrics_ledger'));
    expect(bio?.params).toContain(dto.weightKg);

    const goalsInsert = mock.calls.find((c) =>
      c.text.includes('INSERT INTO user_goals'),
    );
    expect(goalsInsert?.params).toContain(expected.dailyCalories);
    expect(goalsInsert?.params).toContain(expected.proteinG);

    const deactivate = mock.calls.find((c) =>
      c.text.includes('UPDATE user_goals SET is_active = FALSE'),
    );
    expect(deactivate?.params).toEqual(['user-1']);
  });
});
