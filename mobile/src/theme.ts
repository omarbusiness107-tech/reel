import { useColorScheme, type TextStyle } from "react-native";
import { useApp } from "./providers/AppProvider";
export const dark = {
  bg: "#101113",
  surface: "#1A1C20",
  raised: "#23252A",
  high: "#2B2E34",
  text: "#F3EFE5",
  muted: "#A6A7AB",
  secondary: "#B9B6AF",
  line: "#34363C",
  outline: "#777A82",
  accent: "#FF654F",
  onAccent: "#18100E",
  pressed: "#F07866",
  accentContainer: "#3B2422",
  onAccentContainer: "#FFB5A6",
  mint: "#A6CBB4",
  danger: "#FF9585",
  warning: "#E6BC78",
  onImage: "#FFF9EF",
};
export const light = {
  bg: "#F3EFE5",
  surface: "#FFFCF5",
  raised: "#E7E1D7",
  high: "#DDD5C9",
  text: "#191A1D",
  muted: "#626267",
  secondary: "#626267",
  line: "#CFC8BE",
  outline: "#79746C",
  accent: "#A82D1E",
  onAccent: "#FFFFFF",
  pressed: "#8F2519",
  accentContainer: "#F6D8CF",
  onAccentContainer: "#742015",
  mint: "#35654D",
  danger: "#A82D1E",
  warning: "#7C5316",
  onImage: "#FFF9EF",
};
export const space = { xs: 4, sm: 8, md: 12, lg: 20, xl: 32, xxl: 40 };
export const type = {
  hero: {
    fontSize: 36,
    lineHeight: 42,
    fontFamily: "serif",
    letterSpacing: -0.5,
  },
  headline: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subhead: { fontSize: 18, lineHeight: 24, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  metric: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
} satisfies Record<string, TextStyle>;
export function useTheme() {
  const { preferences } = useApp();
  const scheme = useColorScheme();
  return preferences.appearance === "light" ||
    (preferences.appearance === "system" && scheme === "light")
    ? light
    : dark;
}
