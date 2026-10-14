export type TweetStatus = 'pending' | 'posted' | 'skipped';

export interface ScheduledTweet {
  id: string;
  index: number; // 0-based position in the plan
  text: string;
  scheduledAt: number; // epoch ms
  status: TweetStatus;
  notificationId?: string;
}

export interface Plan {
  id: string;
  createdAt: number;
  days: number;
  minIntervalMin: number;
  tweets: ScheduledTweet[];
}

export interface Draft {
  count: number;
  days: number;
  minIntervalMin: number;
  tweets: string[];
}
