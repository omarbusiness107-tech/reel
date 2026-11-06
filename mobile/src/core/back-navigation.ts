export interface BackNavigation {
  canGoBack(): boolean;
  back(): void;
  replace(href: "/(tabs)"): void;
}

// Both the visible Back control and Android system Back use the same policy.
// A cold-opened detail still has a safe home destination. Only the home screen
// with no navigation history lets Android's normal exit/background action run.
export function backOrHome(
  navigation: BackNavigation,
  atHome = false,
): boolean {
  if (navigation.canGoBack()) {
    navigation.back();
    return true;
  }
  if (!atHome) {
    navigation.replace("/(tabs)");
    return true;
  }
  return false;
}
