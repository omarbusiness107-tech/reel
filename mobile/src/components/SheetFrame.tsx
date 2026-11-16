import React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  Easing,
  ReduceMotion,
} from "react-native-reanimated";
import { useTheme } from "../theme";
import { Button, Copy } from "./ui";

const enter = FadeInDown.duration(240)
  .easing(Easing.bezier(0.16, 1, 0.3, 1))
  .withInitialValues({ opacity: 0, transform: [{ translateY: 32 }] })
  .reduceMotion(ReduceMotion.System);

export function SheetFrame({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <View
        style={{ flex: 1, justifyContent: "flex-end", alignItems: "center" }}
      >
        <Pressable
          accessible={false}
          onPress={onClose}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,.48)",
          }}
        />
        <Animated.View
          entering={enter}
          accessibilityViewIsModal
          style={{
            backgroundColor: c.surface,
            elevation: 6,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            width: "100%",
            maxWidth: 560,
            maxHeight: "85%",
            paddingHorizontal: 20,
            paddingBottom: Math.max(16, insets.bottom),
          }}
        >
          <View
            style={{
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Copy kind="title" accessibilityRole="header" style={{ flex: 1 }}>
              {title}
            </Copy>
            <Button
              iconOnly
              label="Close"
              icon="close"
              variant="quiet"
              onPress={onClose}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16, paddingVertical: 12 }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
