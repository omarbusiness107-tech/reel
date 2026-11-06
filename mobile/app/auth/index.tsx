import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../../src/services/supabase";
import { config } from "../../src/services/config";
import { completeAuth } from "../../src/services/auth-callback";
import {
  Page,
  Copy,
  Button,
  Field,
  BackHeader,
  ErrorNote,
} from "../../src/components/ui";
import { Lumi } from "../../src/components/Lumi";
import { useTheme } from "../../src/theme";
import { useApp } from "../../src/providers/AppProvider";
import { showAccountLibrary } from "../../src/navigation";
WebBrowser.maybeCompleteAuthSession();
export default function Auth() {
  const c = useTheme();
  const { setPreferences } = useApp();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState("");
  async function submit() {
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      if (!email.includes("@")) throw new Error("Enter your email address.");
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          config.authRedirectEnabled
            ? { redirectTo: "reel://auth/callback?flow=recovery" }
            : undefined,
        );
        if (error) throw error;
        setNotice(
          config.authRedirectEnabled
            ? "Check your email for a recovery link."
            : "Check your email. The recovery link opens the existing Reel website.",
        );
        return;
      }
      if (password.length < 8 && mode === "signup")
        throw new Error("Use at least 8 characters for your password.");
      const result =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: config.authRedirectEnabled
                ? { emailRedirectTo: "reel://auth/callback" }
                : undefined,
            });
      if (result.error) throw result.error;
      if (result.data.session) {
        await setPreferences({ onboarded: true });
        showAccountLibrary();
      } else
        setNotice("Check your email to confirm your account, then sign in.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "reel://auth/callback",
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) throw new Error("Google sign-in is unavailable.");
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        "reel://auth/callback",
      );
      if (result.type === "success") {
        await completeAuth(result.url);
        await setPreferences({ onboarded: true });
        showAccountLibrary();
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page>
        <BackHeader title="Your Reel account" />
        <View style={{ gap: 16, paddingTop: 20 }}>
          <Lumi state="greeting" size={90} />
          <Copy kind="hero">
            {mode === "signup"
              ? "Make it\nyour Reel."
              : mode === "reset"
                ? "Let’s get\nyou back in."
                : "Good to\nsee you again."}
          </Copy>
          <Copy style={{ color: c.muted }}>
            Use the same account as the Reel website. Your library stays in
            sync.
          </Copy>
        </View>
        <View style={{ gap: 14 }}>
          <Field
            accessibilityLabel="Email address"
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          {mode !== "reset" ? (
            <Field
              accessibilityLabel="Password"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              onSubmitEditing={() => void submit()}
            />
          ) : null}
          <ErrorNote error={error} />
          {notice ? (
            <Copy accessibilityRole="alert" style={{ color: c.mint }}>
              {notice}
            </Copy>
          ) : null}
          <Button
            label={
              mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send recovery email"
            }
            loading={busy}
            onPress={() => void submit()}
          />
          {config.googleEnabled &&
          config.authRedirectEnabled &&
          mode === "signin" ? (
            <Button
              label="Continue with Google"
              variant="secondary"
              loading={busy}
              onPress={() => void google()}
            />
          ) : null}
          <Button
            label={mode === "signin" ? "Create an account" : "Back to sign in"}
            variant="quiet"
            onPress={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice("");
            }}
          />
          {mode === "signin" ? (
            <Button
              label="Forgot password?"
              variant="quiet"
              onPress={() => {
                setMode("reset");
                setError(null);
              }}
            />
          ) : null}
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
}
