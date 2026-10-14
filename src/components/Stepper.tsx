import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  emoji: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
}

export function Stepper({ emoji, label, value, onChange, min, max, step = 1, suffix, hint }: Props) {
  const bump = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    bump.setValue(1.25);
    Animated.spring(bump, { toValue: 1, useNativeDriver: true, bounciness: 14 }).start();
  }, [value, bump]);

  const change = (dir: 1 | -1) => {
    const next = Math.min(max, Math.max(min, value + dir * step));
    if (next === value) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>
          {emoji}  {label}
        </Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.row}>
        <RoundBtn text="−" onPress={() => change(-1)} disabled={value <= min} />
        <Animated.View style={[styles.valueBox, { transform: [{ scale: bump }] }]}>
          <Text style={styles.value}>{value}</Text>
          {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        </Animated.View>
        <RoundBtn text="+" onPress={() => change(1)} disabled={value >= max} />
      </View>
    </View>
  );
}

function RoundBtn({ text, onPress, disabled }: { text: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        disabled && { opacity: 0.35 },
        pressed && { transform: [{ scale: 0.9 }], backgroundColor: colors.cardBorder },
      ]}
    >
      <Text style={styles.btnText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
  hint: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: -2 },
  valueBox: { minWidth: 56, alignItems: 'center' },
  value: { color: colors.text, fontSize: 26, fontWeight: '900' },
  suffix: { color: colors.textDim, fontSize: 11, fontWeight: '600', marginTop: -2 },
});
