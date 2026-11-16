import React from "react";
import { View } from "react-native";
import type { Title } from "../core/types";
import { Artwork } from "./TitleCard";
import { Copy, usePageLayout } from "./ui";
import { useTheme } from "../theme";

export function DetailHero({ title }: { title: Title }) {
  const c = useTheme();
  const { available, content, fontScale } = usePageLayout();
  const compact = available < 360 || fontScale >= 1.5;
  const poster = Math.min(compact ? 176 : 168, Math.round(content * 0.46));
  return (
    <View
      style={{
        flexDirection: compact ? "column" : "row",
        gap: 20,
        alignItems: "center",
      }}
    >
      <Artwork title={title} width={poster} fit="contain" />
      <View
        style={{
          flex: compact ? undefined : 1,
          width: compact ? "100%" : undefined,
          gap: 8,
        }}
      >
        <Copy kind="headline" accessibilityRole="header">
          {title.title}
        </Copy>
        <Copy style={{ color: c.muted }}>
          {[
            title.year,
            title.type === "series" ? "TV series" : title.type,
            title.runtime ? `${title.runtime} min` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </Copy>
        {title.score ? (
          <Copy style={{ color: c.mint, fontWeight: "600" }}>
            ★ {title.score.toFixed(1)}{" "}
            <Copy kind="small" style={{ color: c.muted }}>
              /10 · Catalog rating
            </Copy>
          </Copy>
        ) : null}
        {title.country ? (
          <Copy kind="small" style={{ color: c.muted }}>
            {title.country}
          </Copy>
        ) : null}
      </View>
    </View>
  );
}
