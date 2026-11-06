import React from "react";
import { Stack, Redirect, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useReducedMotion } from "react-native-reanimated";
import { AppProvider, useApp } from "../src/providers/AppProvider";
import { useTheme, dark } from "../src/theme";
import { Page, Loading } from "../src/components/ui";
function Routes() {
  const { ready, preferences } = useApp();
  const c = useTheme();
  const reduced = useReducedMotion();
  const segments = useSegments();
  if (!ready)
    return (
      <Page>
        <Loading label="Opening your cinema journal…" />
      </Page>
    );
  if (
    !preferences.onboarded &&
    segments[0] !== "onboarding" &&
    segments[0] !== "auth"
  )
    return <Redirect href="/onboarding" />;
  return (
    <>
      <StatusBar style={c.bg === dark.bg ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          animation: reduced ? "fade" : "default",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="title/[id]" />
        <Stack.Screen name="person/[id]" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="stats" />
      </Stack>
    </>
  );
}
export default function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <Routes />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
