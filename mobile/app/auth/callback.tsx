import React, { useEffect, useState } from "react";
import { Linking } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/services/supabase";
import { completeAuth } from "../../src/services/auth-callback";
import {
  Page,
  Copy,
  Field,
  Button,
  ErrorNote,
  Loading,
} from "../../src/components/ui";
import { useApp } from "../../src/providers/AppProvider";
export default function Callback() {
  const params = useLocalSearchParams<{
    code?: string;
    flow?: string;
    error_description?: string;
  }>();
  const [error, setError] = useState<unknown>(() =>
    params.error_description ? new Error(params.error_description) : undefined,
  );
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(!params.error_description);
  const { setPreferences } = useApp();
  useEffect(() => {
    if (params.error_description) return;
    let alive = true;
    let handled = "";
    async function handle(url: string) {
      if (url === handled) return;
      handled = url;
      try {
        const recovery = await completeAuth(url);
        if (!alive) return;
        if (recovery) setRecovery(true);
        else {
          await setPreferences({ onboarded: true });
          router.replace("/(tabs)/library");
        }
      } catch (e) {
        if (alive) setError(e);
      } finally {
        if (alive) setBusy(false);
      }
    }
    if (params.code)
      void handle(
        `reel://auth/callback?code=${encodeURIComponent(params.code)}${params.flow === "recovery" ? "&flow=recovery" : ""}`,
      );
    else
      void Linking.getInitialURL().then((url) => {
        if (url) void handle(url);
        else {
          setError(new Error("Open your sign-in link from your email."));
          setBusy(false);
        }
      });
    const listener = Linking.addEventListener("url", (e) => void handle(e.url));
    return () => {
      alive = false;
      listener.remove();
    };
  }, [params.code, params.flow, params.error_description, setPreferences]);
  async function update() {
    setBusy(true);
    try {
      if (password.length < 8) throw new Error("Use at least 8 characters.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await setPreferences({ onboarded: true });
      router.replace("/(tabs)/library");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      {busy && !recovery ? <Loading label="Completing sign-in…" /> : null}
      <ErrorNote error={error} />
      {recovery ? (
        <>
          <Copy kind="hero">A fresh start.</Copy>
          <Field
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            accessibilityLabel="New password"
            secureTextEntry
            autoComplete="new-password"
          />
          <Button
            label="Save new password"
            loading={busy}
            onPress={() => void update()}
          />
        </>
      ) : (
        <Button
          label="Back to sign in"
          variant="secondary"
          onPress={() => router.replace("/auth")}
        />
      )}
    </Page>
  );
}
