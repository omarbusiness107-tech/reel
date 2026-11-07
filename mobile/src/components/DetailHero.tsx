import React from "react";
import { View, useWindowDimensions } from "react-native";
import type { Title } from "../core/types";
import { Artwork } from "./TitleCard";
import { Copy } from "./ui";
import { useTheme } from "../theme";

export function DetailHero({ title }: { title: Title }) {
  const c = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.4;
  const poster = Math.min(168, Math.round((width - 40) * 0.42));
  return (
    <View
      style={{
        flexDirection: fontScale > 1.6 ? "column" : "row",
        gap: 22,
        alignItems: fontScale > 1.6 ? "flex-start" : "center",
      }}
    >
      <Artwork title={title} width={poster} />
      <View style={{ flex: 1, gap: 14 }}>
        <Copy
          kind="title"
          style={{ fontSize: compact ? 28 : 34, lineHeight: compact ? 34 : 39 }}
        >
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
              community rating
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
