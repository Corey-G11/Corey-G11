import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingProvider } from '../src/store/onboarding.store';
import { theme } from '../src/theme';

export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.black },
          }}
        />
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}
