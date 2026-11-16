import React, { useState } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Page, Copy, Button, ErrorNote } from "../src/components/ui";
import { Lumi } from "../src/components/Lumi";
import { useTheme } from "../src/theme";
import { useApp } from "../src/providers/AppProvider";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";

const stepEntry = FadeIn.duration(140).reduceMotion(ReduceMotion.System);
const steps = [
  {
    title: "Find something to watch.",
    body: "A film for tonight. A series to get lost in. Tell Reel what you’re in the mood for.",
  },
  {
    title: "Keep track of what you watch.",
    body: "Keep your watchlist, episode progress and cinema memories together. Your existing Reel account comes with you.",
  },
];
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const { setPreferences } = useApp();
  const c = useTheme();
  const { height } = useWindowDimensions();
  async function finish(auth = false) {
    setSaving(true);
    try {
      await setPreferences({ onboarded: true });
      router.replace(auth ? "/auth" : "/(tabs)");
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Page scroll={false}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 28,
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Copy style={{ fontSize: 29, fontWeight: "800", letterSpacing: -1 }}>
            reel<Copy style={{ color: c.accent, fontSize: 32 }}>.</Copy>
          </Copy>
          <Button
            label="Skip"
            onPress={() => void finish()}
            variant="quiet"
            disabled={saving}
          />
        </View>
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <Lumi
            state={step ? "ready" : "greeting"}
            size={Math.min(height < 650 ? 80 : 144, height * 0.21)}
          />
        </View>
        <View style={{ gap: 20 }}>
          <Animated.View key={step} entering={stepEntry} style={{ gap: 12 }}>
            <Copy kind="label" style={{ color: c.accent }}>
              Step {step + 1} of {steps.length}
            </Copy>
            <Copy kind="hero" accessibilityRole="header">
              {steps[step].title}
            </Copy>
            <Copy style={{ color: c.secondary }}>{steps[step].body}</Copy>
          </Animated.View>
          <ErrorNote error={error} />
          <Button
            label={step ? "Start discovering" : "Meet your next watch"}
            icon="arrow-forward"
            loading={saving}
            onPress={() => (step ? void finish() : setStep(1))}
          />
          {step ? (
            <Button
              label="I already have a Reel account"
              variant="quiet"
              disabled={saving}
              onPress={() => void finish(true)}
            />
          ) : null}
        </View>
      </ScrollView>
    </Page>
  );
}
