import { router } from "expo-router";
// An auth modal can sit above an existing tab navigator. Replacing that modal
// with another navigator would retain a second, hidden set of private screens.
export function showAccountLibrary() {
  if (router.canDismiss()) {
    router.dismissAll();
    router.navigate("/(tabs)/library");
  } else router.replace("/(tabs)/library");
}
