import React, { useState } from "react";
import { View, Switch, Linking, ScrollView } from "react-native";
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
import Constants from "expo-constants";
import { LibraryCard } from "../../src/components/LibraryCard";
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
  const rated = (library.data || [])
    .filter((t) => (t.rating || 0) > 0)
    .sort(
      (a, b) => (b.rating || 0) - (a.rating || 0) || a.id.localeCompare(b.id),
    )
    .slice(0, 6);
  return (
    <Page>
      <View style={{ gap: 12 }}>
        <Copy kind="headline" accessibilityRole="header">
          You
        </Copy>
        {session ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: c.accentContainer,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Copy kind="title" style={{ color: c.onAccentContainer }}>
                {session.user.email?.slice(0, 1).toUpperCase() || "R"}
              </Copy>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Copy kind="subhead">{session.user.email || "Reel account"}</Copy>
              <Copy kind="small" style={{ color: c.secondary }}>
                {library.data
                  ? library.data.length + " titles in your library"
                  : library.isPending
                    ? "Opening your library…"
                    : "Library unavailable"}
              </Copy>
            </View>
          </View>
        ) : (
          <Button
            label="Sign in / create account"
            onPress={() => router.push("/auth")}
          />
        )}
      </View>
      <ErrorNote error={error || authError} />
      <Section title="Your activity">
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
      {session && rated.length ? (
        <Section title="Top rated" kicker="Your ratings">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {rated.map((title) => (
              <LibraryCard key={title.id} title={title} width={136} />
            ))}
          </ScrollView>
        </Section>
      ) : null}
      <Section title="Preferences">
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
      <Section title="Account">
        <Copy style={{ color: c.secondary }}>
          Your notes are private. Chats stay in this session. Your Reel account
          works on the website and in the app.
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
        {Constants.expoConfig?.version
          ? "Reel " + Constants.expoConfig.version
          : "Reel"}
      </Copy>
    </Page>
  );
}
