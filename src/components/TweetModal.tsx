import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { dayLabel, formatTime } from '../scheduler';
import { colors, gradients, radius } from '../theme';
import { ScheduledTweet } from '../types';
import { GradientButton } from './GradientButton';

interface Props {
  tweet: ScheduledTweet | null;
  total: number;
  onClose: () => void;
  onMark: (id: string, status: 'posted' | 'skipped' | 'pending') => void;
}

export function TweetModal({ tweet, total, onClose, onMark }: Props) {
  const [copied, setCopied] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCopied(false);
    if (tweet) {
      slide.setValue(0);
      Animated.spring(slide, { toValue: 1, useNativeDriver: true, bounciness: 9 }).start();
    }
  }, [tweet?.id, slide, tweet]);

  if (!tweet) return null;

  const copy = async () => {
    await Clipboard.setStringAsync(tweet.text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const postOnX = async () => {
    await Clipboard.setStringAsync(tweet.text);
    const encoded = encodeURIComponent(tweet.text);
    try {
      // the X / Twitter app, with the tweet pre-filled
      await Linking.openURL(`twitter://post?message=${encoded}`);
    } catch {
      // no app installed → web composer, also pre-filled
      await Linking.openURL(`https://x.com/intent/post?text=${encoded}`);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) },
              ],
            },
          ]}
        >
          <Pressable onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.kicker}>
              TWEET {tweet.index + 1} OF {total} · {dayLabel(tweet.scheduledAt).toUpperCase()}{' '}
              {formatTime(tweet.scheduledAt)}
            </Text>

            <View style={styles.card}>
              <View style={styles.head}>
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 20 }}>😎</Text>
                </View>
                <View>
                  <Text style={styles.name}>You</Text>
                  <Text style={styles.at}>@you · now</Text>
                </View>
              </View>
              <Text style={styles.text} selectable>
                {tweet.text}
              </Text>
              <Text style={styles.count}>{tweet.text.length}/280</Text>
            </View>

            <View style={styles.row}>
              <GradientButton
                title={copied ? 'Copied! ✓' : '📋 Copy'}
                colorsPair={copied ? gradients.success : gradients.primary}
                onPress={copy}
                style={{ flex: 1 }}
              />
              <GradientButton title="Post on 𝕏 ↗" colorsPair={gradients.hot} onPress={postOnX} style={{ flex: 1 }} />
            </View>

            {tweet.status === 'pending' ? (
              <View style={styles.row}>
                <GradientButton
                  small
                  title="✅ I posted it!"
                  colorsPair={gradients.success}
                  onPress={() => onMark(tweet.id, 'posted')}
                  style={{ flex: 2 }}
                />
                <GradientButton
                  small
                  variant="ghost"
                  title="Skip"
                  onPress={() => onMark(tweet.id, 'skipped')}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <GradientButton
                small
                variant="ghost"
                title={`↩️ Undo "${tweet.status}"`}
                onPress={() => onMark(tweet.id, 'pending')}
              />
            )}
            <Text style={styles.tip}>"Post on 𝕏" copies the text too, in case the composer opens empty.</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,5,15,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgSoft,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.cardBorder,
    alignSelf: 'center',
    marginBottom: 14,
  },
  kicker: { color: colors.textDim, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  head: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  at: { color: colors.textDim, fontSize: 12 },
  text: { color: colors.text, fontSize: 19, lineHeight: 27 },
  count: { color: colors.textFaint, fontSize: 12, textAlign: 'right', marginTop: 10 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  tip: { color: colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: 6 },
});
