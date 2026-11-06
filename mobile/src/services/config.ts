import { safeOrigin } from "../core/safety";
export const config = {
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    "https://zwedeotmsmtfkshxeezn.supabase.co",
  publishableKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_Vr6DqmUCRgtlB8j10JAvYg_EelZsKgh",
  apiOrigin: safeOrigin(
    process.env.EXPO_PUBLIC_REEL_API_URL || "https://reel-navy.vercel.app",
  ),
  authRedirectEnabled:
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_ENABLED !== "false",
  googleEnabled: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
};
