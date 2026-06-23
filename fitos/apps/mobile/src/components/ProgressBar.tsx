import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({
  currentStep,
  totalSteps,
}: ProgressBarProps): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;
  const pct = Math.max(0, Math.min(1, currentStep / totalSteps));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: pct,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [pct, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.emerald,
  },
});
