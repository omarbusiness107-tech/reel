import React, { useState } from "react";
import { View, Switch, Linking } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../src/services/supabase";
import { config } from "../../src/services/config";
import { useApp } from "../../src/providers/AppProvider";
import { useLibrary } from "../../src/services/hooks";
import { useTheme } from "../../src/theme";
import {
  Page,
  Copy,
  Button,
  Chips,
  Section,
  ErrorNote,
} from "../../src/components/ui";
import { Lumi } from "../../src/components/Lumi";
export default function Profile() {
  const c = useTheme();
  const { session, preferences, setPreferences, authError } = useApp();
  const library = useLibrary();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  async function setting(patch: Parameters<typeof setPreferences>[0]) {
    try {
      await setPreferences(patch);
    } catch (e) {
      setError(e);
    }
  }
  async function signout() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <View style={{ gap: 15, paddingTop: 8 }}>
        <Lumi state="greeting" size={88} />
        <Copy kind="hero">{"Your little\ncinema corner."}</Copy>
        <Copy style={{ color: c.muted }}>
          {session?.user.email || "A great story starts with you."}
        </Copy>
        {session ? (
          <Copy kind="small" style={{ color: c.mint }}>
            {library.data?.length || 0} titles in your collection
          </Copy>
        ) : (
          <Button
            label="Sign in / create account"
            onPress={() => router.push("/auth")}
          />
        )}
      </View>
      <ErrorNote error={error || authError} />
      <Section title="Your viewing life">
        <Button
          label="Activity & watch history"
          icon="time-outline"
          variant="secondary"
          onPress={() => router.push("/activity")}
        />
        <Button
          label="Watch calendar"
          icon="calendar-outline"
          variant="secondary"
          onPress={() => router.push("/calendar")}
        />
        <Button
          label="Viewing insights"
          icon="stats-chart-outline"
          variant="secondary"
          onPress={() => router.push("/stats")}
        />
      </Section>
      <Section title="Set the mood">
        <Copy kind="label">APPEARANCE</Copy>
        <Chips
          values={
            [
              { value: "dark", label: "After dark" },
              { value: "light", label: "Matinee" },
              { value: "system", label: "Use system" },
            ] as const
          }
          value={preferences.appearance}
          onChange={(v) => void setting({ appearance: v })}
        />
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Copy>Haptic feedback</Copy>
            <Copy kind="small" style={{ color: c.muted }}>
              A small confirmation when a save succeeds.
            </Copy>
          </View>
          <Switch
            value={preferences.haptics}
            onValueChange={(v) => void setting({ haptics: v })}
            accessibilityLabel="Haptic feedback"
            trackColor={{ true: c.accent, false: c.line }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Copy>Use my ratings for recommendations</Copy>
            <Copy kind="small" style={{ color: c.muted }}>
              Optional genre affinity, when at least three titles have ratings
              of 8–10.
            </Copy>
          </View>
          <Switch
            value={preferences.useRatings}
            onValueChange={(v) => void setting({ useRatings: v })}
            accessibilityLabel="Use my ratings for recommendations"
            trackColor={{ true: c.accent, false: c.line }}
          />
        </View>
        <Copy kind="small" style={{ color: c.muted }}>
          Motion follows your device’s Reduce Motion setting. Appearance and
          haptic preferences stay on this device.
        </Copy>
      </Section>
      <Section title="Yours stays yours">
        <Copy style={{ color: c.muted }}>
          Your library and dated activity use the same protected account as the
          Reel website. Conversations are temporary and clear on account
          changes. Passwords and AI provider keys are never stored in the app
          bundle.
        </Copy>
        <Copy kind="small" style={{ color: c.muted }}>
          Reel does not currently run a mobile notification service. No push
          permissions are requested. Account deletion and notification delivery
          are not implemented by the existing backend.
        </Copy>
        <Button
          label="Open Reel website"
          icon="open-outline"
          variant="secondary"
          onPress={() =>
            void Linking.openURL(
              config.apiOrigin || "https://reel-navy.vercel.app",
            )
          }
        />
        {session ? (
          <Button
            label="Sign out"
            variant="danger"
            loading={busy}
            onPress={() => void signout()}
          />
        ) : null}
      </Section>
      <Copy kind="small" style={{ color: c.muted, textAlign: "center" }}>
        {
          "REEL / ANDROID · 1.0.0\nA little less scrolling. A little more cinema."
        }
      </Copy>
    </Page>
  );
}
