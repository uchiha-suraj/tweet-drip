import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, gradients, radius } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  colorsPair?: readonly [string, string];
  disabled?: boolean;
  variant?: 'solid' | 'ghost';
  small?: boolean;
  style?: ViewStyle;
}

export function GradientButton({
  title,
  onPress,
  colorsPair = gradients.primary,
  disabled,
  variant = 'solid',
  small,
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  const padding = small ? { paddingVertical: 10, paddingHorizontal: 16 } : { paddingVertical: 16, paddingHorizontal: 22 };

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity: disabled ? 0.45 : 1 }, style]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => to(0.94)}
        onPressOut={() => to(1)}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
      >
        {variant === 'solid' ? (
          <LinearGradient
            colors={colorsPair}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, padding]}
          >
            <Text style={[styles.text, small && styles.small]}>{title}</Text>
          </LinearGradient>
        ) : (
          <Animated.View style={[styles.base, styles.ghost, padding]}>
            <Text style={[styles.text, styles.ghostText, small && styles.small]}>{title}</Text>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  small: { fontSize: 14 },
  ghost: { borderWidth: 1.5, borderColor: colors.cardBorder, backgroundColor: colors.bgSoft },
  ghostText: { color: colors.text },
});
