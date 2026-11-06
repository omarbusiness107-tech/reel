import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  type TextProps,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useTheme } from "../theme";
import { Lumi, type LumiState } from "./Lumi";
import { router } from "expo-router";
export function Copy({
  kind = "body",
  style,
  ...props
}: TextProps & { kind?: "body" | "small" | "label" | "title" | "hero" }) {
  const c = useTheme();
  return (
    <Text
      {...props}
      style={[
        {
          color: c.text,
          fontSize:
            kind === "hero"
              ? 42
              : kind === "title"
                ? 28
                : kind === "small"
                  ? 12
                  : kind === "label"
                    ? 12
                    : 15,
          lineHeight:
            kind === "hero"
              ? 46
              : kind === "title"
                ? 34
                : kind === "small"
                  ? 18
                  : 22,
          fontWeight: kind === "label" ? "700" : undefined,
          fontFamily:
            kind === "title" || kind === "hero"
              ? Platform.OS === "ios"
                ? "Georgia"
                : "serif"
              : undefined,
          letterSpacing: kind === "label" ? 1.5 : kind === "hero" ? -1.2 : 0,
        },
        style,
      ]}
    />
  );
}
export function Page({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[{ flex: 1, backgroundColor: c.bg }, style]}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 24 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={c.accent}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const fg =
    variant === "primary"
      ? c.onAccent
      : variant === "danger"
        ? c.danger
        : c.text;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled: !!disabled || !!loading,
        busy: !!loading,
      }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          minHeight: 48,
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor:
            variant === "primary"
              ? c.accent
              : variant === "secondary"
                ? c.raised
                : "transparent",
          flexDirection: "row",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed && !reduced ? 0.97 : 1 }],
          transitionProperty: ["transform"],
          transitionDuration: 120,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : icon ? (
        <Ionicons name={icon} size={19} color={fg} />
      ) : null}
      <Copy style={{ color: fg, fontWeight: "700" }}>{label}</Copy>
    </AnimatedPressable>
  );
}
export function Field({ style, ...props }: TextInputProps) {
  const c = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      style={[
        {
          minHeight: 52,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: c.text,
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          fontSize: 16,
        },
        style,
      ]}
    />
  );
}
export function Chips<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {values.map((v) => (
        <Pressable
          key={v.value}
          onPress={() => onChange(v.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === v.value }}
          style={{
            minHeight: 48,
            paddingHorizontal: 16,
            justifyContent: "center",
            backgroundColor: value === v.value ? c.text : c.surface,
            borderColor: c.line,
            borderWidth: 1,
            borderRadius: 24,
          }}
        >
          <Copy
            style={{
              color: value === v.value ? c.bg : c.muted,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {v.label}
          </Copy>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function Section({
  title,
  kicker,
  children,
  action,
}: {
  title: string;
  kicker?: string;
  children?: React.ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, gap: 5 }}>
          {kicker ? (
            <Copy kind="label" style={{ color: c.accent }}>
              {kicker.toUpperCase()}
            </Copy>
          ) : null}
          <Copy kind="title">{title}</Copy>
        </View>
        {action ? (
          <Button
            label={action.label}
            variant="quiet"
            onPress={action.onPress}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}
export function State({
  title,
  body,
  state = "no-results",
  action,
}: {
  title: string;
  body: string;
  state?: LumiState;
  action?: { label: string; onPress: () => void };
}) {
  const c = useTheme();
  return (
    <View style={{ paddingVertical: 32, gap: 14, alignItems: "center" }}>
      <Lumi state={state} size={92} />
      <Copy kind="title" style={{ textAlign: "center" }}>
        {title}
      </Copy>
      <Copy style={{ textAlign: "center", color: c.muted, maxWidth: 330 }}>
        {body}
      </Copy>
      {action ? <Button {...action} /> : null}
    </View>
  );
}
export function ErrorNote({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const c = useTheme();
  if (!error) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.danger,
        gap: 8,
      }}
    >
      <Copy style={{ color: c.danger }}>
        {error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String(error.message)
            : "Something went wrong. Please try again."}
      </Copy>
      {retry ? (
        <Button label="Try again" variant="quiet" onPress={retry} />
      ) : null}
    </View>
  );
}
export function Loading({
  label = "Finding the good stuff…",
}: {
  label?: string;
}) {
  const c = useTheme();
  return (
    <View
      style={{ gap: 18, paddingVertical: 28 }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Lumi state="searching" size={42} />
        <Copy style={{ color: c.muted }}>{label}</Copy>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              aspectRatio: 2 / 3,
              backgroundColor: c.raised,
              borderRadius: 10,
            }}
          />
        ))}
      </View>
    </View>
  );
}
export function BackHeader({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Button
        label="Back"
        icon="arrow-back"
        variant="quiet"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/(tabs)")
        }
      />
      <Copy kind="label" style={{ flex: 1 }}>
        {title.toUpperCase()}
      </Copy>
    </View>
  );
}
export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  stack: { gap: 14 },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
});
