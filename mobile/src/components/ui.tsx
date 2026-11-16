import React, { createContext, useContext, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextProps,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  cubicBezier,
  useReducedMotion,
} from "react-native-reanimated";
import { type, useTheme } from "../theme";
import { Lumi, type LumiState } from "./Lumi";
import { goBack, useAndroidBack } from "../navigation";
export function Copy({
  kind = "body",
  style,
  ...props
}: TextProps & { kind?: keyof typeof type }) {
  const c = useTheme();
  return <Text {...props} style={[{ color: c.text }, type[kind], style]} />;
}
export const TabPage = createContext(false);

export function usePageLayout() {
  const inTabs = useContext(TabPage);
  const { width, height, fontScale } = useWindowDimensions();
  const available = width - (inTabs && width >= 600 ? 80 : 0);
  const gutter = available < 360 ? 16 : available >= 600 ? 24 : 20;
  const content = Math.min(available, 1200) - gutter * 2;
  return { available, gutter, content, height, fontScale };
}

export function Page({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  style,
  gap = 32,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  const c = useTheme();
  const inTabs = useContext(TabPage);
  const { gutter } = usePageLayout();
  return (
    <SafeAreaView
      edges={
        inTabs ? ["top", "left", "right"] : ["top", "left", "right", "bottom"]
      }
      style={[{ flex: 1, backgroundColor: c.bg }, style]}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            width: "100%",
            maxWidth: 1200,
            alignSelf: "center",
            padding: gutter,
            paddingBottom: 40,
            gap,
          }}
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
  iconOnly,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  iconOnly?: boolean;
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
          minHeight: variant === "primary" ? 52 : 48,
          minWidth: 48,
          paddingHorizontal: iconOnly ? 0 : 16,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor:
            variant === "primary"
              ? pressed
                ? c.pressed
                : c.accent
              : variant === "secondary"
                ? c.raised
                : "transparent",
          flexDirection: "row",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale: pressed && !reduced ? 0.98 : 1 }],
          transitionProperty: ["transform"],
          transitionDuration: reduced ? 0 : pressed ? 90 : 120,
          transitionTimingFunction: cubicBezier(0.2, 0, 0, 1),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : icon ? (
        <Ionicons name={icon} size={19} color={fg} />
      ) : null}
      {!iconOnly ? (
        <Copy style={{ color: fg, fontWeight: "600", flexShrink: 1 }}>
          {label}
        </Copy>
      ) : null}
    </AnimatedPressable>
  );
}
export function Field({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const c = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={c.muted}
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        {
          minHeight: 56,
          borderRadius: 12,
          paddingHorizontal: focused ? 15 : 16,
          paddingVertical: focused ? 13 : 14,
          color: c.text,
          backgroundColor: c.surface,
          borderColor: focused ? c.text : c.outline,
          borderWidth: focused ? 2 : 1,
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
  style,
  wrap = false,
}: {
  values: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  wrap?: boolean;
}) {
  const c = useTheme();
  const chips = values.map((v) => (
    <Pressable
      key={v.value}
      onPress={() => onChange(v.value)}
      accessibilityRole="button"
      accessibilityLabel={v.label}
      accessibilityState={{ selected: value === v.value }}
      style={{
        minHeight: 48,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          minHeight: 36,
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: value === v.value ? c.accent : c.outline,
          backgroundColor: value === v.value ? c.accentContainer : c.surface,
        }}
      >
        {value === v.value ? (
          <Ionicons
            name="checkmark"
            size={14}
            color={c.onAccentContainer}
            accessible={false}
          />
        ) : null}
        <Copy
          kind="small"
          style={{
            color: value === v.value ? c.onAccentContainer : c.secondary,
            fontWeight: "600",
            flexShrink: 1,
          }}
        >
          {v.label}
        </Copy>
      </View>
    </Pressable>
  ));
  return wrap ? (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: 8 }, style]}>
      {chips}
    </View>
  ) : (
    <ScrollView
      horizontal
      style={style}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {chips}
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
    <View style={{ gap: 12 }}>
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
          <Copy kind="title" accessibilityRole="header">
            {title}
          </Copy>
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
      <Lumi state={state} size={64} />
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
  posters = false,
}: {
  label?: string;
  posters?: boolean;
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
      {posters ? (
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
      ) : null}
    </View>
  );
}
export function BackHeader({ title }: { title: string }) {
  useAndroidBack();
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Button
        label="Back"
        icon="arrow-back"
        iconOnly
        variant="quiet"
        onPress={goBack}
      />
      <Copy kind="subhead" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
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
