import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';

interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function OnboardingLayout({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onContinue,
  continueLabel,
  continueDisabled,
  loading,
  children,
}: OnboardingLayoutProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.logo}>FitOS</Text>
        <Text style={styles.stepIndicator}>
          Step {step} of {totalSteps}
        </Text>
      </View>

      <View style={styles.progressWrap}>
        <ProgressBar currentStep={step} totalSteps={totalSteps} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.content}>{children}</View>
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && onBack ? (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        ) : null}
        <View style={styles.continueWrap}>
          <Button
            label={continueLabel ?? 'Continue'}
            onPress={onContinue}
            disabled={continueDisabled}
            loading={loading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  logo: {
    fontFamily: 'monospace',
    color: theme.colors.emerald,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepIndicator: {
    color: theme.colors.muted,
    fontSize: 12,
  },
  progressWrap: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    color: theme.colors.white,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginBottom: theme.spacing.md,
  },
  content: {
    marginTop: theme.spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  backButton: {
    paddingVertical: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  backText: {
    color: theme.colors.muted,
    fontSize: 15,
  },
  continueWrap: {
    flex: 1,
  },
});
