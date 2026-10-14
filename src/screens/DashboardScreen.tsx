import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GradientButton } from '../components/GradientButton';
import { dayLabel, formatDuration, formatTime } from '../scheduler';
import { colors, gradients, radius } from '../theme';
import { Plan, ScheduledTweet } from '../types';

interface Props {
  plan: Plan;
  onOpenTweet: (id: string) => void;
  onNewPlan: () => void;
  onTest: () => void;
}

export function DashboardScreen({ plan, onOpenTweet, onNewPlan, onTest }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const total = plan.tweets.length;
  const posted = plan.tweets.filter((t) => t.status === 'posted').length;
  const done = plan.tweets.filter((t) => t.status !== 'pending').length;
  const due = plan.tweets.filter((t) => t.status === 'pending' && t.scheduledAt <= now);
  const next = plan.tweets.find((t) => t.status === 'pending' && t.scheduledAt > now);
  const allDone = done === total;

  // group by calendar day
  const groups: { label: string; items: ScheduledTweet[] }[] = [];
  for (const t of plan.tweets) {
    const label = dayLabel(t.scheduledAt, now);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(t);
    else groups.push({ label, items: [t] });
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.topRow}>
        <Text style={styles.brand}>🐦 Tweet Drip</Text>
        <Pressable onPress={onNewPlan} hitSlop={10}>
          <Text style={styles.newPlan}>＋ New plan</Text>
        </Pressable>
      </View>

      <LinearGradient colors={['#1D4ED8', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        {allDone ? (
          <>
            <Text style={styles.heroKicker}>ALL DONE</Text>
            <Text style={styles.heroBig}>🏆 {posted}/{total} posted</Text>
            <Text style={styles.heroSmall}>Legend behaviour. Start a new plan whenever you're ready.</Text>
          </>
        ) : due.length > 0 ? (
          <>
            <Text style={styles.heroKicker}>IT'S TIME</Text>
            <Text style={styles.heroBig}>🔔 {due.length} tweet{due.length > 1 ? 's' : ''} due</Text>
            <GradientButton
              small
              title="Open now →"
              colorsPair={gradients.hot}
              onPress={() => onOpenTweet(due[0].id)}
              style={{ alignSelf: 'flex-start', marginTop: 12 }}
            />
          </>
        ) : next ? (
          <>
            <Text style={styles.heroKicker}>NEXT TWEET IN</Text>
            <Pulse>
              <Text style={styles.heroBig}>{formatDuration(next.scheduledAt - now, true)}</Text>
            </Pulse>
            <Text style={styles.heroSmall}>
              at {formatTime(next.scheduledAt)} · {dayLabel(next.scheduledAt, now).toLowerCase()}
            </Text>
          </>
        ) : null}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(done / total) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {posted} posted · {done - posted} skipped · {total - done} to go
        </Text>
      </LinearGradient>

      {groups.map((g) => (
        <View key={g.label} style={{ gap: 8 }}>
          <Text style={styles.groupLabel}>{g.label}</Text>
          {g.items.map((t) => (
            <TweetRow key={t.id} tweet={t} now={now} onPress={() => onOpenTweet(t.id)} />
          ))}
        </View>
      ))}

      <GradientButton small variant="ghost" title="🧪 Send a test notification (5s)" onPress={onTest} />
      <Text style={styles.footnote}>
        You'll get a notification at each time. Tap any tweet to copy or post it early.
      </Text>
    </ScrollView>
  );
}

function TweetRow({
  tweet,
  now,
  onPress,
}: {
  tweet: ScheduledTweet;
  now: number;
  onPress: () => void;
}) {
  const isDue = tweet.status === 'pending' && tweet.scheduledAt <= now;
  const status =
    tweet.status === 'posted'
      ? { text: '✅ Posted', color: colors.green }
      : tweet.status === 'skipped'
        ? { text: '⏭️ Skipped', color: colors.textFaint }
        : isDue
          ? { text: '🔔 Due', color: colors.pink }
          : { text: '⏳ Upcoming', color: colors.blue };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isDue && { borderColor: colors.pink },
        tweet.status !== 'pending' && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowNum}>#{tweet.index + 1}</Text>
        <Text style={styles.rowTime}>
          {formatTime(tweet.scheduledAt)}
        </Text>
      </View>
      <Text style={[styles.rowText, tweet.status === 'posted' && styles.strike]} numberOfLines={2}>
        {tweet.text}
      </Text>
      <Text style={[styles.pill, { color: status.color, borderColor: status.color }]}>{status.text}</Text>
    </Pressable>
  );
}

function Pulse({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={{ transform: [{ scale: v }], alignSelf: 'flex-start' }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 16, paddingBottom: 60 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  newPlan: { color: colors.blue, fontWeight: '800', fontSize: 15 },
  hero: { borderRadius: radius.lg, padding: 20 },
  heroKicker: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  heroBig: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
  heroSmall: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6 },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },
  progressText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8, fontWeight: '600' },
  groupLabel: { color: colors.textDim, fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  rowLeft: { width: 56 },
  rowNum: { color: colors.textFaint, fontSize: 11, fontWeight: '800' },
  rowTime: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 2 },
  rowText: { flex: 1, color: colors.text, fontSize: 14 },
  strike: { textDecorationLine: 'line-through', color: colors.textDim },
  pill: {
    fontSize: 11,
    fontWeight: '800',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  footnote: { color: colors.textFaint, fontSize: 12, textAlign: 'center' },
});
