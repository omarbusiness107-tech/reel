import { useColorScheme } from "react-native";
import { useApp } from "./providers/AppProvider";
export const dark = {
  bg: "#101113",
  surface: "#1A1C20",
  raised: "#23252A",
  text: "#F3EFE5",
  muted: "#A6A7AB",
  line: "#34363C",
  accent: "#FF654F",
  onAccent: "#18100E",
  mint: "#A6CBB4",
  danger: "#FF9585",
};
export const light = {
  bg: "#F3EFE5",
  surface: "#FFFCF5",
  raised: "#E7E1D7",
  text: "#191A1D",
  muted: "#626267",
  line: "#CFC8BE",
  accent: "#A82D1E",
  onAccent: "#FFFFFF",
  mint: "#35654D",
  danger: "#A82D1E",
};
export const space = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, xxl: 40 };
export const motion = { press: 120, reveal: 200 };
export function useTheme() {
  const { preferences } = useApp();
  const scheme = useColorScheme();
  return preferences.appearance === "light" ||
    (preferences.appearance === "system" && scheme === "light")
    ? light
    : dark;
}
