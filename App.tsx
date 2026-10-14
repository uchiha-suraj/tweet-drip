import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Confetti } from './src/components/Confetti';
import { TweetModal } from './src/components/TweetModal';
import { cancelAll, cancelTweet, ensurePermissions, scheduleTweet, sendTest } from './src/notifications';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { loadDraft, loadPlan, saveDraft, savePlan } from './src/storage';
import { colors } from './src/theme';
import { Draft, Plan, TweetStatus } from './src/types';

const EMPTY_DRAFT: Draft = { count: 10, days: 1, minIntervalMin: 45, tweets: Array(10).fill('') };

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [openId, setOpenId] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    (async () => {
      const [p, d] = await Promise.all([loadPlan(), loadDraft()]);
      if (p) setPlan(p);
      if (d) setDraft(d);
      setLoaded(true);
    })();
  }, []);

  // Tapping a notification (app open, in background, or fully closed) opens that tweet.
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastResponse.notification.request.content.data?.tweetId;
    if (typeof id === 'string') setOpenId(id);
    Notifications.clearLastNotificationResponse();
  }, [lastResponse]);

  const updatePlan = useCallback((next: Plan | null) => {
    setPlan(next);
    savePlan(next);
  }, []);

  const updateDraft = useCallback((next: Draft) => {
    setDraft(next);
    saveDraft(next);
  }, []);

  const markTweet = async (id: string, status: TweetStatus) => {
    if (!plan) return;
    const tweet = plan.tweets.find((t) => t.id === id);
    if (!tweet) return;
    let notificationId = tweet.notificationId;

    if (status !== 'pending') {
      // done early → don't nag later
      await cancelTweet(notificationId);
      notificationId = undefined;
    } else if (tweet.scheduledAt > Date.now()) {
      // undo → bring the reminder back
      notificationId = await scheduleTweet(tweet, plan.tweets.length, plan.id);
    }

    updatePlan({
      ...plan,
      tweets: plan.tweets.map((t) => (t.id === id ? { ...t, status, notificationId } : t)),
    });

    if (status === 'posted') {
      setBurst((b) => b + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setOpenId(null);
    } else if (status === 'skipped') {
      setOpenId(null);
    }
  };

  const newPlan = () =>
    Alert.alert('Start a new plan?', 'This cancels every reminder in the current plan.', [
      { text: 'Keep current', style: 'cancel' },
      {
        text: 'Start fresh',
        style: 'destructive',
        onPress: async () => {
          await cancelAll();
          updatePlan(null);
          updateDraft(EMPTY_DRAFT);
        },
      },
    ]);

  const test = async () => {
    if (!plan) return;
    const ok = await ensurePermissions();
    if (!ok) {
      Alert.alert('Notifications are off 🔕', 'Enable them in your phone settings first.');
      return;
    }
    const sample = plan.tweets.find((t) => t.status === 'pending') ?? plan.tweets[0];
    await sendTest(sample, plan.tweets.length, plan.id);
    Alert.alert('Incoming! 🛰️', 'A test reminder lands in ~5 seconds. Lock your phone or leave the app to see it.');
  };

  const openTweet = plan?.tweets.find((t) => t.id === openId) ?? null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        {!loaded ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blue} size="large" />
          </View>
        ) : plan ? (
          <DashboardScreen plan={plan} onOpenTweet={setOpenId} onNewPlan={newPlan} onTest={test} />
        ) : (
          <SetupScreen
            draft={draft}
            onDraftChange={updateDraft}
            onScheduled={(p) => {
              updatePlan(p);
              saveDraft(null);
              setBurst((b) => b + 1);
            }}
          />
        )}
        <TweetModal
          tweet={openTweet}
          total={plan?.tweets.length ?? 0}
          onClose={() => setOpenId(null)}
          onMark={markTweet}
        />
        <Confetti trigger={burst} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
