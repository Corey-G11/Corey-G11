import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../src/theme';

export default function Home(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.logo}>FitOS</Text>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Your dashboard is coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  logo: {
    fontFamily: 'monospace',
    color: theme.colors.emerald,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.sm,
  },
});
