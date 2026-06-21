import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../src/components/Input';
import { SelectCard } from '../../src/components/SelectCard';
import { OnboardingLayout } from '../../src/components/OnboardingLayout';
import { useOnboarding } from '../../src/store/onboarding.store';

const TOTAL_STEPS = 5;

function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date')
    .refine((v) => {
      const age = ageFromDob(v);
      return age >= 13 && age <= 100;
    }, 'Age must be between 13 and 100'),
  gender: z.enum(['male', 'female', 'other']),
  heightCm: z
    .string()
    .refine((v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n >= 100 && n <= 250;
    }, 'Height must be 100–250 cm'),
  weightKg: z
    .string()
    .refine((v) => {
      const n = Number(v);
      return !Number.isNaN(n) && n >= 30 && n <= 300;
    }, 'Weight must be 30–300 kg'),
});

type FormValues = z.infer<typeof schema>;

export default function Step1Basics(): React.JSX.Element {
  const router = useRouter();
  const { data, setFields } = useOnboarding();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: data.firstName ?? '',
      dateOfBirth: data.dateOfBirth ?? '',
      gender: data.gender ?? 'male',
      heightCm: data.heightCm ? String(data.heightCm) : '',
      weightKg: data.weightKg ? String(data.weightKg) : '',
    },
  });

  const onContinue = handleSubmit((values) => {
    setFields({
      firstName: values.firstName,
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      heightCm: Number(values.heightCm),
      weightKg: Number(values.weightKg),
    });
    router.push('/(onboarding)/step-2-goals');
  });

  return (
    <OnboardingLayout
      step={1}
      totalSteps={TOTAL_STEPS}
      title="Let's build your profile."
      subtitle="A few basics so we can tailor your plan."
      onContinue={onContinue}
    >
      <Controller
        control={control}
        name="firstName"
        render={({ field: { value, onChange } }) => (
          <Input
            label="First Name"
            value={value}
            onChangeText={onChange}
            error={errors.firstName?.message}
            placeholder="Alex"
          />
        )}
      />

      <Controller
        control={control}
        name="dateOfBirth"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Date of Birth"
            value={value}
            onChangeText={onChange}
            error={errors.dateOfBirth?.message}
            placeholder="YYYY-MM-DD"
          />
        )}
      />

      <Controller
        control={control}
        name="gender"
        render={({ field: { value, onChange } }) => (
          <View>
            <SelectCard
              icon="♂"
              title="Male"
              selected={value === 'male'}
              onPress={() => onChange('male')}
            />
            <SelectCard
              icon="♀"
              title="Female"
              selected={value === 'female'}
              onPress={() => onChange('female')}
            />
            <SelectCard
              icon="⚧"
              title="Other"
              selected={value === 'other'}
              onPress={() => onChange('other')}
            />
          </View>
        )}
      />

      <View style={{ height: 12 }} />

      <Controller
        control={control}
        name="heightCm"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Height (cm)"
            value={value}
            onChangeText={onChange}
            error={errors.heightCm?.message}
            keyboardType="numeric"
            placeholder="180"
          />
        )}
      />

      <Controller
        control={control}
        name="weightKg"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Weight (kg)"
            value={value}
            onChangeText={onChange}
            error={errors.weightKg?.message}
            keyboardType="numeric"
            placeholder="80"
          />
        )}
      />
    </OnboardingLayout>
  );
}
