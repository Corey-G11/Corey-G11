import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { useSession } from '../../src/store/session.store';
import { useOnboarding } from '../../src/store/onboarding.store';
import { register } from '../../src/features/auth/api';
import { theme } from '../../src/theme';

export default function RegisterScreen(): React.JSX.Element {
  const router = useRouter();
  const { setToken } = useSession();
  const { setField } = useOnboarding();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onSubmit = async (): Promise<void> => {
    if (!firstName.trim()) {
      setError('What should we call you?');
      return;
    }
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const auth = await register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
      });
      await setToken(auth.accessToken);
      // Seed the onboarding flow with the name they just gave us.
      setField('firstName', firstName.trim());
      router.replace('/(onboarding)/step-1-basics');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>FitOS</Text>
        <Text style={styles.title}>Create your account.</Text>
        <Text style={styles.subtitle}>Then we'll build your plan.</Text>

        <View style={styles.form}>
          <Input
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Alex"
            autoCapitalize="words"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.spacer} />
          <Button
            label="Create Account"
            onPress={() => void onSubmit()}
            loading={loading}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
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
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  logo: {
    fontFamily: 'monospace',
    color: theme.colors.emerald,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginTop: theme.spacing.md,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  form: {
    marginTop: theme.spacing.xl,
  },
  spacer: {
    height: theme.spacing.sm,
  },
  error: {
    color: theme.colors.red,
    fontSize: 13,
    marginTop: theme.spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  link: {
    color: theme.colors.emerald,
    fontSize: 14,
    fontWeight: '600',
  },
});
