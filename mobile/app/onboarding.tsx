import React, { useState } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Page, Copy, Button, ErrorNote } from "../src/components/ui";
import { Lumi } from "../src/components/Lumi";
import { useTheme } from "../src/theme";
import { useApp } from "../src/providers/AppProvider";
const steps = [
  {
    number: "01 / A LITTLE LESS SCROLLING",
    title: "Find your\nnext obsession.",
    body: "A film for tonight. A series to get lost in. Tell Reel what you’re in the mood for.",
  },
  {
    number: "02 / A LITTLE MORE YOU",
    title: "Your taste.\nYour timeline.",
    body: "Keep your watchlist, episode progress and cinema memories together. Your existing Reel account comes with you.",
  },
];
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<unknown>();
  const { setPreferences } = useApp();
  const c = useTheme();
  const { height } = useWindowDimensions();
  async function finish(auth = false) {
    try {
      await setPreferences({ onboarded: true });
      router.replace(auth ? "/auth" : "/(tabs)");
    } catch (e) {
      setError(e);
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
          <Button label="Skip" onPress={() => void finish()} variant="quiet" />
        </View>
        <View style={{ alignItems: "center", paddingVertical: 28 }}>
          <Lumi
            state={step ? "ready" : "greeting"}
            size={Math.min(190, height * 0.21)}
          />
        </View>
        <View style={{ gap: 20 }}>
          <Copy kind="label" style={{ color: c.accent }}>
            {steps[step].number}
          </Copy>
          <Copy kind="hero">{steps[step].title}</Copy>
          <Copy style={{ color: c.muted, fontSize: 17, lineHeight: 26 }}>
            {steps[step].body}
          </Copy>
          <ErrorNote error={error} />
          <Button
            label={step ? "Start discovering" : "Meet your next watch"}
            icon="arrow-forward"
            onPress={() => (step ? void finish() : setStep(1))}
          />
          {step ? (
            <Button
              label="I already have a Reel account"
              variant="quiet"
              onPress={() => void finish(true)}
            />
          ) : (
            <Copy kind="small" style={{ color: c.muted, textAlign: "center" }}>
              Your next great story is out there.
            </Copy>
          )}
        </View>
      </ScrollView>
    </Page>
  );
}
