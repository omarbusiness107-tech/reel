import React from "react";
import { Tabs, usePathname } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme";
import { useAndroidBack } from "../../src/navigation";
import { TabPage } from "../../src/components/ui";
export default function TabLayout() {
  const pathname = usePathname();
  useAndroidBack(pathname === "/");
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const rail = width >= 600;
  return (
    <TabPage.Provider value>
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          animation: "none",
          tabBarPosition: rail ? "left" : "bottom",
          tabBarVariant: rail ? "material" : "uikit",
          tabBarLabelPosition: "below-icon",
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: c.accent,
          tabBarActiveBackgroundColor: c.accentContainer,
          tabBarInactiveTintColor: c.muted,
          tabBarStyle: {
            backgroundColor: c.bg,
            borderTopColor: c.line,
            ...(rail
              ? { width: 80, borderRightColor: c.line }
              : {
                  height: (fontScale >= 1.5 ? 76 : 64) + insets.bottom,
                  paddingBottom: insets.bottom,
                }),
          },
          tabBarLabel: ({ children, focused }) => (
            <Text
              style={{
                color: focused ? c.text : c.muted,
                textAlign: "center",
                fontSize: 12,
                lineHeight: 16,
                fontWeight: "600",
                marginHorizontal: rail ? -8 : 0,
              }}
            >
              {children}
            </Text>
          ),
          sceneStyle: { backgroundColor: c.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Discover",
            tabBarAccessibilityLabel: "Discover",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="compass-outline"
                size={size}
                color={typeof color === "number" ? c.text : (color ?? c.text)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="ask"
          options={{
            title: "Ask Reel",
            tabBarAccessibilityLabel: "Ask Reel",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="sparkles-outline"
                size={size}
                color={typeof color === "number" ? c.text : (color ?? c.text)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarAccessibilityLabel: "Search",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="search-outline"
                size={size}
                color={typeof color === "number" ? c.text : (color ?? c.text)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarAccessibilityLabel: "Library",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="albums-outline"
                size={size}
                color={typeof color === "number" ? c.text : (color ?? c.text)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "You",
            tabBarAccessibilityLabel: "You",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="person-circle-outline"
                size={size}
                color={typeof color === "number" ? c.text : (color ?? c.text)}
              />
            ),
          }}
        />
      </Tabs>
    </TabPage.Provider>
  );
}
