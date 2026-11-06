import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120000,
      gcTime: 600000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
interface Preferences {
  onboarded: boolean;
  appearance: "dark" | "light" | "system";
  haptics: boolean;
  useRatings: boolean;
}
const defaults: Preferences = {
  onboarded: false,
  appearance: "dark",
  haptics: true,
  useRatings: false,
};
const Context = createContext<{
  session: Session | null;
  ready: boolean;
  authError: string;
  preferences: Preferences;
  setPreferences: (patch: Partial<Preferences>) => Promise<void>;
}>({
  session: null,
  ready: false,
  authError: "",
  preferences: defaults,
  setPreferences: async () => {},
});
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [preferences, setPrefs] = useState(defaults);
  const preferencesRef = useRef(defaults);
  const settingsQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    let owner: string | undefined;
    const apply = (next: Session | null) => {
      if (!active) return;
      if (owner !== next?.user.id) {
        void queryClient.cancelQueries();
        queryClient.clear();
        owner = next?.user.id;
      }
      setSession(next);
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => apply(next));
    void Promise.all([
      supabase.auth.getSession().then(({ data, error }) => {
        if (error && active) setAuthError(error.message);
        apply(data.session);
      }),
      AsyncStorage.getItem("reel.mobile.preferences.v1").then((raw) => {
        if (raw && active) {
          try {
            const p = JSON.parse(raw);
            const next = { ...defaults, ...p };
            preferencesRef.current = next;
            setPrefs(next);
          } catch {
            /* reset malformed non-sensitive preferences */
          }
        }
      }),
    ])
      .catch(() => {
        if (active)
          setAuthError(
            "Your saved session could not be restored. Sign in again.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    if (AppState.currentState === "active") supabase.auth.startAutoRefresh();
    const listener = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    if (Platform.OS === "web") onlineManager.setOnline(true);
    return () => {
      active = false;
      subscription.unsubscribe();
      listener.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
  const setPreferences = useCallback((patch: Partial<Preferences>) => {
    const task = settingsQueue.current
      .catch(() => {})
      .then(async () => {
        const next = { ...preferencesRef.current, ...patch };
        await AsyncStorage.setItem(
          "reel.mobile.preferences.v1",
          JSON.stringify(next),
        );
        preferencesRef.current = next;
        setPrefs(next);
      });
    settingsQueue.current = task;
    return task;
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Context.Provider
        value={{ session, ready, authError, preferences, setPreferences }}
      >
        {children}
      </Context.Provider>
    </QueryClientProvider>
  );
}
export const useApp = () => useContext(Context);
