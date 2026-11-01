import AsyncStorage from '@react-native-async-storage/async-storage';

const FEEDBACK_KEY = 'lumina:insight-feedback:v1';
const SHOWN_KEY = 'lumina:insight-shown:v1';

export type InsightFeedback = {
  helpful?: 1 | -1; // 1=helpful, -1=not helpful
  updatedAt?: number; // epoch ms
};

export type InsightFeedbackMap = Record<string, InsightFeedback>;

export type InsightShown = {
  lastShownAt?: number; // epoch ms
  shownCount7d?: number; // approximate counter
  updatedAt?: number; // epoch ms
};

export type InsightShownMap = Record<string, InsightShown>;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Feedback */
export async function getInsightFeedbackMap(): Promise<InsightFeedbackMap> {
  return readJson<InsightFeedbackMap>(FEEDBACK_KEY, {});
}

export async function setInsightFeedback(
  insightId: string,
  patch: Partial<InsightFeedback>
): Promise<InsightFeedbackMap> {
  const map = await getInsightFeedbackMap();
  const now = Date.now();
  map[insightId] = { ...(map[insightId] ?? {}), ...patch, updatedAt: now };
  await writeJson(FEEDBACK_KEY, map);
  return map;
}

export async function markInsightHelpful(insightId: string) {
  return setInsightFeedback(insightId, { helpful: 1 });
}

export async function markInsightNotHelpful(insightId: string) {
  return setInsightFeedback(insightId, { helpful: -1 });
}

/** Shown tracking */
export async function getInsightShownMap(): Promise<InsightShownMap> {
  return readJson<InsightShownMap>(SHOWN_KEY, {});
}

export async function recordInsightShown(insightId: string): Promise<InsightShownMap> {
  const map = await getInsightShownMap();
  const now = Date.now();
  const prev = map[insightId] ?? {};
  map[insightId] = {
    lastShownAt: now,
    shownCount7d: (prev.shownCount7d ?? 0) + 1,
    updatedAt: now,
  };
  await writeJson(SHOWN_KEY, map);
  return map;
}