import React from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Title } from "../core/types";
import { useTheme } from "../theme";
import { tracking } from "../core/shared";
import { Artwork, openTitle } from "./TitleCard";
import { Copy } from "./ui";

export function LibraryCard({ title, width }: { title: Title; width: number }) {
  const c = useTheme();
  const status =
    title.status === "going"
      ? ["series", "anime"].includes(title.type) && title.episode
        ? tracking.episodeLabel(title, title.season || 1, title.episode)
        : "In progress"
      : title.status === "done"
        ? "Watched"
        : title.status === "suggested"
          ? "Saved pick"
          : title.status === "want"
            ? "Watchlist"
            : title.status === "waiting"
              ? "Waiting"
              : title.status === "dropped"
                ? "Dropped"
                : title.status === "paused"
                  ? "Paused"
                  : "Saved";
  return (
    <Pressable
      onPress={() => openTitle(title)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${title.title}`}
      style={{ width, gap: 10, paddingBottom: 10 }}
    >
      <View style={{ width }}>
        <Artwork title={title} width={width} />
        {title.fav ? (
          <View
            style={{
              position: "absolute",
              top: 9,
              right: 9,
              backgroundColor: c.bg,
              borderRadius: 16,
              width: 30,
              height: 30,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="heart"
              size={16}
              color={c.accent}
              accessibilityLabel="Favorite"
            />
          </View>
        ) : null}
      </View>
      <View style={{ gap: 5 }}>
        <Copy
          numberOfLines={3}
          style={{ fontWeight: "700", fontSize: 16, lineHeight: 21 }}
        >
          {title.title}
        </Copy>
        <Copy kind="small" style={{ color: c.muted }}>
          {[title.year, title.type === "series" ? "TV series" : title.type]
            .filter(Boolean)
            .join(" · ")}
        </Copy>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 7,
            alignItems: "center",
          }}
        >
          <Copy
            kind="small"
            style={{
              color:
                title.status === "going" || title.status === "done"
                  ? c.mint
                  : c.muted,
            }}
          >
            {status}
          </Copy>
          {title.rating ? (
            <Copy
              kind="small"
              accessibilityLabel={`Your rating ${title.rating} out of 10`}
              style={{ color: c.accent }}
            >
              ★ {title.rating}/10
            </Copy>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
