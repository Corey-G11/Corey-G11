import React from 'react';
import { Stack } from 'expo-router';
import { theme } from '../../src/theme';

export default function AuthLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.black },
      }}
    />
  );
}
