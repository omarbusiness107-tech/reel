import { supabase } from "./supabase";
import { callbackCode } from "../core/safety";
const exchanges = new Map<string, Promise<boolean>>();
// Android Linking and the system OAuth browser can both receive the same callback.
// Exchange the one-use PKCE code once, without persisting or logging it.
export function completeAuth(url: string): Promise<boolean> {
  const { code, recovery } = callbackCode(url);
  if (!code)
    return Promise.reject(
      new Error("This sign-in link has expired. Request a new one."),
    );
  const existing = exchanges.get(code);
  if (existing) return existing;
  const task = supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
    if (error) throw error;
    return recovery;
  });
  exchanges.set(code, task);
  void task
    .finally(() => setTimeout(() => exchanges.delete(code), 60000))
    .catch(() => {});
  return task;
}
