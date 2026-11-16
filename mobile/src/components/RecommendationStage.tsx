import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
} from "react-native-reanimated";
import type { Title } from "../core/types";
import { useTheme } from "../theme";
import { Artwork, openTitle } from "./TitleCard";
import { Button, Copy } from "./ui";

const switchPick = FadeIn.duration(180)
  .easing(Easing.bezier(0.2, 0, 0, 1))
  .reduceMotion(ReduceMotion.System);

export function RecommendationStage({
  titles,
  selected,
  onSelect,
  compact,
  saved,
  saving,
  onSave,
}: {
  titles: Title[];
  selected: number;
  onSelect: (index: number) => void;
  compact: boolean;
  saved: (title: Title) => boolean;
  saving: boolean;
  onSave: (title: Title) => void;
}) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const title = titles[selected];
  if (!title) return null;
  const inLibrary = saved(title);
  const posterWidth = compact
    ? 96
    : Math.min(216, Math.round((width - 72) * 0.58));
  return (
    <View
      style={{
        gap: 12,
        padding: 16,
        backgroundColor: c.surface,
        borderRadius: 16,
      }}
    >
      <Copy
        kind="label"
        style={{ color: c.secondary }}
        accessibilityLiveRegion="polite"
      >
        Pick {selected + 1} of {titles.length}
      </Copy>
      <Animated.View
        key={title.recId || title.id}
        entering={switchPick}
        style={{ gap: 12 }}
      >
        <View
          style={{
            flexDirection: compact ? "row" : "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ paddingTop: !compact && titles.length > 1 ? 12 : 0 }}>
            {!compact && titles.length > 1 ? (
              <View
                importantForAccessibility="no-hide-descendants"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 12,
                  right: 12,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: c.high,
                  borderWidth: 1,
                  borderColor: c.outline,
                }}
              />
            ) : null}
            {!compact && titles.length > 2 ? (
              <View
                importantForAccessibility="no-hide-descendants"
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  right: 6,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: c.raised,
                  borderWidth: 1,
                  borderColor: c.line,
                }}
              />
            ) : null}
            <Artwork title={title} width={posterWidth} decorative />
          </View>
          <View
            style={{
              alignSelf: "stretch",
              flexShrink: 1,
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Copy kind="subhead" accessibilityRole="header">
              {title.title}
            </Copy>
            <Copy kind="small" style={{ color: c.secondary }}>
              {[
                title.year,
                title.type === "series" ? "TV series" : title.type,
                title.runtime ? `${title.runtime} min` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Copy>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Copy kind="label" style={{ color: c.accent }}>
            Why this fits
          </Copy>
          <Copy>
            {title.why || "No explanation was returned for this pick."}
          </Copy>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button
            label="Details"
            variant="secondary"
            icon="arrow-forward"
            onPress={() => openTitle(title)}
          />
          {inLibrary ? (
            <View
              style={{
                minHeight: 48,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Copy kind="small" style={{ color: c.mint }}>
                In your library
              </Copy>
            </View>
          ) : (
            <Button
              label="Save pick"
              icon="bookmark-outline"
              loading={saving}
              onPress={() => onSave(title)}
            />
          )}
        </View>
      </Animated.View>
      {titles.length > 1 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Button
            label="Previous pick"
            icon="chevron-back"
            iconOnly
            variant="quiet"
            disabled={selected === 0}
            onPress={() => onSelect(selected - 1)}
          />
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {titles.map((pick, index) => (
              <Pressable
                key={pick.recId || pick.id}
                accessibilityRole="button"
                accessibilityLabel={`Pick ${index + 1}: ${pick.title}`}
                accessibilityState={{ selected: index === selected }}
                onPress={() => onSelect(index)}
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  padding: 2,
                  alignItems: "center",
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: index === selected ? c.accent : "transparent",
                }}
              >
                <Artwork title={pick} width={40} decorative />
              </Pressable>
            ))}
          </View>
          <Button
            label="Next pick"
            icon="chevron-forward"
            iconOnly
            variant="quiet"
            disabled={selected === titles.length - 1}
            onPress={() => onSelect(selected + 1)}
          />
        </View>
      ) : null}
    </View>
  );
}
