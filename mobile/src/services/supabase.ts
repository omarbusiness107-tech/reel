import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { config } from "./config";
import { secureStorage } from "../core/secure-storage";

// A session may exceed Android's per-entry size limit. Publish a manifest last.
// Tokens never fall back to unencrypted AsyncStorage or browser localStorage.
const memory = new Map<string, string>();
const webStorage = {
  getItem: async (k: string) => memory.get(k) ?? null,
  setItem: async (k: string, v: string) => {
    memory.set(k, v);
  },
  removeItem: async (k: string) => {
    memory.delete(k);
  },
};
const storage = Platform.OS === "web" ? webStorage : secureStorage(SecureStore);
export const supabase = createClient(
  config.supabaseUrl,
  config.publishableKey,
  {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: processLock,
    },
  },
);
