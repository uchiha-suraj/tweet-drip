import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GradientButton } from '../components/GradientButton';
import { Stepper } from '../components/Stepper';
import { ensurePermissions, scheduleAll } from '../notifications';
import {
  LIMITS,
  averageGapLabel,
  dayLabel,
  formatDuration,
  formatTime,
  generateTimes,
  uid,
  validatePlan,
} from '../scheduler';
import { colors, gradients, radius } from '../theme';
import { Draft, Plan, ScheduledTweet } from '../types';

const PROMPTS = [
  'Share a hot take about your stack 🔥',
  'What did you learn today?',
  'A tiny win worth celebrating 🎉',
  'Ask your followers a question 🤔',
  'Drop a useful tip or trick 💡',
  'Something you are building right now 🛠️',
  'A thread starter… 🧵',
  'An unpopular opinion 🌶️',
];

interface Props {
  draft: Draft;
  onDraftChange: (d: Draft) => void;
  onScheduled: (plan: Plan) => void;
}

export function SetupScreen({ draft, onDraftChange, onScheduled }: Props) {
  const [step, setStep] = useState(0);
  const [current, setCurrent] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  const { count, days, minIntervalMin, tweets } = draft;
  const cur = Math.min(current, count - 1);
  const error = validatePlan(count, days, minIntervalMin);
  const maxCount = LIMITS.maxPerDay * days;

  const update = (patch: Partial<Draft>) => {
    const next = { ...draft, ...patch };
    // keep the tweets array the same length as the count
    if (patch.count !== undefined || patch.days !== undefined) {
      next.count = Math.min(next.count, LIMITS.maxPerDay * next.days);
      next.tweets = Array.from({ length: next.count }, (_, i) => next.tweets[i] ?? '');
    }
    onDraftChange(next);
  };

  const goTo = (s: number) => {
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setStep(s);
      Animated.spring(fade, { toValue: 1, useNativeDriver: true }).start();
    });
  };

  const reroll = () => setTimes(generateTimes(count, days, minIntervalMin));

  useEffect(() => {
    if (step === 2) reroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const filled = tweets.filter((t) => t.trim().length > 0 && t.length <= LIMITS.maxChars).length;
  const allFilled = filled === count;

  const schedule = async () => {
    setBusy(true);
    try {
      const ok = await ensurePermissions();
      if (!ok) {
        Alert.alert(
          'Notifications are off 🔕',
          'Allow notifications for this app in your phone settings, otherwise reminders cannot reach you.',
        );
        return;
      }
      // if the review sat open for a while, the first slot may already be in the past
      let finalTimes = times;
      if (!finalTimes.length || finalTimes[0] < Date.now() + 30_000) {
        finalTimes = generateTimes(count, days, minIntervalMin);
      }
      const planId = uid();
      const base: ScheduledTweet[] = tweets.map((text, i) => ({
        id: uid() + i,
        index: i,
        text: text.trim(),
        scheduledAt: finalTimes[i],
        status: 'pending',
      }));
      const withIds = await scheduleAll(base, planId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onScheduled({ id: planId, createdAt: Date.now(), days, minIntervalMin, tweets: withIds });
    } catch (e) {
      Alert.alert('Could not schedule', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.brand}>🐦 Tweet Drip</Text>
        <Text style={styles.subtitle}>Random reminders. Pre-written tweets. Zero thinking.</Text>
        <StepDots step={step} onPress={(s) => s < step && goTo(s)} />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: fade,
          transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        {step === 0 && (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.h2}>Set your rhythm</Text>
            <Stepper
              emoji="🐦"
              label="Tweets"
              hint={`Max ${maxCount} (15 per day)`}
              value={count}
              min={1}
              max={maxCount}
              onChange={(v) => update({ count: v })}
            />
            <View style={styles.daysCard}>
              <Text style={styles.label}>📅  Spread over</Text>
              <View style={styles.chips}>
                {[1, 2, 3].map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      update({ days: d });
                    }}
                    style={[styles.chip, days === d && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, days === d && styles.chipTextActive]}>
                      {d} day{d > 1 ? 's' : ''}
                    </Text>
                    <Text style={[styles.chipSub, days === d && styles.chipTextActive]}>{d * 24}h</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Stepper
              emoji="⏱️"
              label="Min gap"
              hint="Random gaps, never shorter than this (30 min floor)"
              value={minIntervalMin}
              min={LIMITS.minInterval}
              max={LIMITS.maxInterval}
              step={5}
              suffix="min"
              onChange={(v) => update({ minIntervalMin: v })}
            />

            <LinearGradient colors={['#1B2350', '#161B3A']} style={styles.summary}>
              <Text style={styles.summaryBig}>
                {count} tweet{count > 1 ? 's' : ''} in {days * 24}h
              </Text>
              <Text style={styles.summarySmall}>
                {averageGapLabel(count, days)} · at least {formatDuration(minIntervalMin * 60_000)} apart
              </Text>
            </LinearGradient>

            {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

            <GradientButton title="Write my tweets ✍️" disabled={!!error} onPress={() => goTo(1)} />
          </ScrollView>
        )}

        {step === 1 && (
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.rowBetween}>
              <Text style={styles.h2}>
                Tweet {cur + 1} <Text style={styles.dim}>of {count}</Text>
              </Text>
              <Text style={styles.dim}>
                {filled}/{count} ready
              </Text>
            </View>

            <View style={styles.tweetDots}>
              {tweets.map((t, i) => {
                const ok = t.trim().length > 0 && t.length <= LIMITS.maxChars;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setCurrent(i)}
                    style={[
                      styles.tweetDot,
                      ok && styles.tweetDotDone,
                      i === cur && styles.tweetDotCurrent,
                    ]}
                  >
                    <Text style={styles.tweetDotText}>{i + 1}</Text>
                  </Pressable>
                );
              })}
            </View>

            <TweetEditor
              key={cur}
              value={tweets[cur] ?? ''}
              placeholder={PROMPTS[cur % PROMPTS.length]}
              onChange={(text) => {
                const next = [...tweets];
                next[cur] = text;
                update({ tweets: next });
              }}
            />

            <View style={styles.rowGap}>
              <GradientButton
                small
                variant="ghost"
                title="← Prev"
                disabled={cur === 0}
                onPress={() => setCurrent(Math.max(0, cur - 1))}
                style={{ flex: 1 }}
              />
              {cur < count - 1 ? (
                <GradientButton
                  small
                  title="Next →"
                  onPress={() => setCurrent(Math.min(count - 1, cur + 1))}
                  style={{ flex: 1 }}
                />
              ) : (
                <GradientButton
                  small
                  title="Review 👀"
                  colorsPair={gradients.hot}
                  disabled={!allFilled}
                  onPress={() => goTo(2)}
                  style={{ flex: 1 }}
                />
              )}
            </View>
            {!allFilled && cur === count - 1 ? (
              <Text style={styles.dim}>Fill every tweet (max 280 chars) to continue.</Text>
            ) : null}
            <GradientButton small variant="ghost" title="⚙️ Change settings" onPress={() => goTo(0)} />
          </ScrollView>
        )}

        {step === 2 && (
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.rowBetween}>
              <Text style={styles.h2}>Your random lineup</Text>
              <GradientButton small variant="ghost" title="🎲 Reroll" onPress={reroll} />
            </View>
            <Text style={styles.dim}>Don't like the times? Reroll until it feels right.</Text>

            {times.map((ts, i) => {
              const gap = i > 0 ? ts - times[i - 1] : null;
              return (
                <View key={i}>
                  {gap !== null ? (
                    <Text style={styles.gap}>⋮ {formatDuration(gap)} later</Text>
                  ) : null}
                  <View style={styles.reviewRow}>
                    <View style={styles.reviewTime}>
                      <Text style={styles.reviewClock}>{formatTime(ts)}</Text>
                      <Text style={styles.reviewDay}>{dayLabel(ts)}</Text>
                    </View>
                    <Text style={styles.reviewText} numberOfLines={2}>
                      {tweets[i]}
                    </Text>
                  </View>
                </View>
              );
            })}

            <GradientButton
              title={busy ? 'Scheduling…' : 'Schedule it 🚀'}
              colorsPair={gradients.hot}
              disabled={busy}
              onPress={schedule}
            />
            <GradientButton small variant="ghost" title="← Edit tweets" onPress={() => goTo(1)} />
          </ScrollView>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function StepDots({ step, onPress }: { step: number; onPress: (s: number) => void }) {
  const labels = ['Rhythm', 'Tweets', 'Launch'];
  return (
    <View style={styles.steps}>
      {labels.map((l, i) => (
        <Pressable key={l} onPress={() => onPress(i)} style={styles.stepItem}>
          <View style={[styles.stepCircle, i <= step && styles.stepCircleOn]}>
            <Text style={styles.stepNum}>{i < step ? '✓' : i + 1}</Text>
          </View>
          <Text style={[styles.stepLabel, i === step && { color: colors.text }]}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TweetEditor({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (t: string) => void;
}) {
  const left = LIMITS.maxChars - value.length;
  const pct = Math.min(1, value.length / LIMITS.maxChars);
  const barColor = left < 0 ? colors.red : left < 20 ? colors.yellow : colors.blue;
  const pop = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 10 }).start();
  }, [pop]);

  const counterStyle = useMemo(
    () => [styles.counter, { color: left < 0 ? colors.red : left < 20 ? colors.yellow : colors.textDim }],
    [left],
  );

  return (
    <Animated.View style={[styles.editor, { transform: [{ scale: pop }] }]}>
      <View style={styles.editorHead}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 18 }}>😎</Text>
        </View>
        <View>
          <Text style={styles.name}>You</Text>
          <Text style={styles.handle}>@future_you · scheduled</Text>
        </View>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline
        autoFocus
        style={styles.input}
      />
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={counterStyle}>{left < 0 ? `${-left} over the limit` : `${left} left`}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  brand: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: colors.textDim, fontSize: 14, marginTop: 4 },
  steps: { flexDirection: 'row', marginTop: 18, gap: 18 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  stepNum: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepLabel: { color: colors.textFaint, fontSize: 13, fontWeight: '700' },
  body: { padding: 20, gap: 14, paddingBottom: 60 },
  h2: { color: colors.text, fontSize: 22, fontWeight: '800' },
  dim: { color: colors.textDim, fontSize: 13 },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
  daysCard: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  chips: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bgSoft,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontWeight: '800', fontSize: 15 },
  chipSub: { color: colors.textDim, fontSize: 11, marginTop: 2, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  summary: { borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: '#2E3A7A' },
  summaryBig: { color: colors.text, fontSize: 20, fontWeight: '900' },
  summarySmall: { color: colors.textDim, fontSize: 13, marginTop: 6 },
  error: { color: colors.red, fontSize: 14, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: 10 },
  tweetDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tweetDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tweetDotDone: { backgroundColor: '#123A2A', borderColor: colors.green },
  tweetDotCurrent: { borderColor: colors.blue, borderWidth: 2.5, transform: [{ scale: 1.12 }] },
  tweetDotText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  editor: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
  },
  editorHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  handle: { color: colors.textDim, fontSize: 12 },
  input: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 25,
    minHeight: 130,
    textAlignVertical: 'top',
    paddingVertical: 6,
  },
  barTrack: { height: 4, backgroundColor: colors.bgSoft, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  barFill: { height: 4, borderRadius: 2 },
  counter: { fontSize: 12, marginTop: 6, textAlign: 'right', fontWeight: '700' },
  gap: { color: colors.textFaint, fontSize: 12, marginLeft: 22, marginVertical: 4, fontWeight: '600' },
  reviewRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    alignItems: 'center',
  },
  reviewTime: { width: 78 },
  reviewClock: { color: colors.blue, fontWeight: '900', fontSize: 15 },
  reviewDay: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  reviewText: { color: colors.text, flex: 1, fontSize: 14 },
});
