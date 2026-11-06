import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "../providers/AppProvider";
import * as library from "./library";
import * as Haptics from "expo-haptics";
export function useLibrary() {
  const { session } = useApp();
  const id = session?.user.id;
  return useQuery({
    queryKey: ["library", id],
    enabled: !!id,
    queryFn: ({ signal }) => library.loadLibrary(id!, signal),
  });
}
export function useEvents() {
  const { session } = useApp();
  const id = session?.user.id;
  return useQuery({
    queryKey: ["events", id],
    enabled: !!id,
    queryFn: ({ signal }) => library.loadEvents(id!, signal),
  });
}
export function useLibraryAction<T>(
  fn: (args: T, id: string) => Promise<unknown>,
) {
  const { session, preferences } = useApp();
  const client = useQueryClient();
  const id = session?.user.id;
  return useMutation({
    mutationFn: async (args: T) => {
      if (!id) throw new Error("Sign in to save your library.");
      return fn(args, id);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["library", id] });
      void client.invalidateQueries({ queryKey: ["events", id] });
      if (preferences.haptics)
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
    },
  });
}
