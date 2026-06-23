import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme';

interface SelectCardProps {
  icon?: string;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}

export function SelectCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: SelectCardProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number): void => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View
        style={[
          styles.card,
          selected ? styles.cardSelected : styles.cardUnselected,
          { transform: [{ scale }] },
        ]}
      >
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  cardSelected: {
    borderColor: theme.colors.emerald,
    backgroundColor: theme.colors.emeraldGlow,
  },
  cardUnselected: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  icon: {
    fontSize: 22,
    marginRight: theme.spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
