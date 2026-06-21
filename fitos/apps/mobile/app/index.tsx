import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../src/store/session.store';
import { theme } from '../src/theme';

export default function Index(): React.JSX.Element {
  const { token, ready } = useSession();

  // Wait for the persisted token to load before deciding where to go.
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.emerald} />
      </View>
    );
  }

  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.black,
  },
});
