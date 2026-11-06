import { useCallback } from "react";
import { BackHandler, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { backOrHome } from "./core/back-navigation";

export function goBack() {
  return backOrHome(router);
}

export function useAndroidBack(atHome = false) {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => backOrHome(router, atHome),
      );
      return () => subscription.remove();
    }, [atHome]),
  );
}
// An auth modal can sit above an existing tab navigator. Replacing that modal
// with another navigator would retain a second, hidden set of private screens.
export function showAccountLibrary() {
  if (router.canDismiss()) {
    router.dismissAll();
    router.navigate("/(tabs)/library");
  } else router.replace("/(tabs)/library");
}
