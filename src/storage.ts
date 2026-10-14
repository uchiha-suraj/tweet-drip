import AsyncStorage from '@react-native-async-storage/async-storage';
import { Draft, Plan } from './types';

const PLAN_KEY = 'tweet-scheduler:plan:v1';
const DRAFT_KEY = 'tweet-scheduler:draft:v1';

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function write(key: string, value: unknown) {
  try {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage is best-effort; the app keeps working in memory
  }
}

export const loadPlan = () => read<Plan>(PLAN_KEY);
export const savePlan = (plan: Plan | null) => write(PLAN_KEY, plan);
export const loadDraft = () => read<Draft>(DRAFT_KEY);
export const saveDraft = (draft: Draft | null) => write(DRAFT_KEY, draft);
