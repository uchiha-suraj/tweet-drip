import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ScheduledTweet } from './types';

const CHANNEL_ID = 'tweet-reminders';

// Show reminders even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Tweet reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#1D9BF0',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

const preview = (text: string) => (text.length > 120 ? text.slice(0, 117) + '…' : text);

export async function scheduleTweet(
  tweet: ScheduledTweet,
  total: number,
  planId: string,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `🐦 Tweet time! (${tweet.index + 1}/${total})`,
      body: preview(tweet.text),
      sound: true,
      data: { planId, tweetId: tweet.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: tweet.scheduledAt,
      channelId: CHANNEL_ID,
    },
  });
}

export async function scheduleAll(
  tweets: ScheduledTweet[],
  planId: string,
): Promise<ScheduledTweet[]> {
  const out: ScheduledTweet[] = [];
  for (const t of tweets) {
    if (t.status !== 'pending' || t.scheduledAt <= Date.now()) {
      out.push(t);
      continue;
    }
    const notificationId = await scheduleTweet(t, tweets.length, planId);
    out.push({ ...t, notificationId });
  }
  return out;
}

export async function cancelTweet(notificationId?: string) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // already fired or gone
  }
}

export const cancelAll = () => Notifications.cancelAllScheduledNotificationsAsync();

/** Fires a sample reminder in a few seconds so you can check notifications work. */
export async function sendTest(tweet: ScheduledTweet, total: number, planId: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🧪 Test • Tweet time! (${tweet.index + 1}/${total})`,
      body: preview(tweet.text),
      sound: true,
      data: { planId, tweetId: tweet.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}
