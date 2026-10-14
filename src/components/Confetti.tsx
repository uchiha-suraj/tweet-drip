import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet } from 'react-native';

const EMOJI = ['🎉', '✨', '🐦', '💙', '🚀', '⭐', '🔥', '💜'];
const { width, height } = Dimensions.get('window');

/** Emoji burst from the middle of the screen. Change `trigger` to fire again. */
export function Confetti({ trigger }: { trigger: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
        const dist = 120 + Math.random() * (width * 0.45);
        return {
          emoji: EMOJI[i % EMOJI.length],
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 80,
          spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
          size: 18 + Math.random() * 16,
        };
      }),
    // new layout every burst
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger],
  );

  useEffect(() => {
    if (!trigger) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [trigger, progress]);

  if (!trigger) return null;

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: width / 2 - 12,
            top: height / 2 - 40,
            fontSize: p.size,
            opacity: progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.6, 1],
                  outputRange: [0, p.dy, p.dy + 140],
                }),
              },
              {
                rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }),
              },
              { scale: progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.2, 1.2, 0.8] }) },
            ],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </Animated.View>
  );
}
