import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Title } from "../core/types";
import { useTheme } from "../theme";
import { Artwork, openTitle } from "./TitleCard";
import { Copy, usePageLayout } from "./ui";

export function Spotlight({ title }: { title: Title }) {
  const c = useTheme();
  const { height, available, fontScale } = usePageLayout();
  const [failedImage, setFailedImage] = useState<string>();
  const landscape =
    title.banner &&
    failedImage !== title.banner &&
    height >= 700 &&
    fontScale < 1.5;
  const color = landscape ? c.onImage : c.text;
  const facts = [title.year, ...title.genres.slice(0, 2)]
    .filter(Boolean)
    .join(" · ");
  const details = (
    <View style={{ gap: 4, flexShrink: 1 }}>
      <Copy kind="label" style={{ color }}>
        In the spotlight
      </Copy>
      <Copy
        kind={landscape ? "headline" : "title"}
        numberOfLines={landscape ? 2 : undefined}
        style={{ color }}
      >
        {title.title}
      </Copy>
      {facts ? (
        <Copy kind="small" style={{ color: landscape ? color : c.secondary }}>
          {facts}
        </Copy>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 4,
        }}
      >
        <Copy kind="small" style={{ color, fontWeight: "600" }}>
          Explore title
        </Copy>
        <Ionicons name="arrow-forward" size={16} color={color} />
      </View>
    </View>
  );
  return (
    <Pressable
      onPress={() => openTitle(title)}
      accessibilityRole="button"
      accessibilityLabel={`Explore ${title.title}`}
      style={{
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: c.surface,
      }}
    >
      {landscape ? (
        <View
          style={{
            height: Math.min(280, Math.max(220, available * 0.66)),
            justifyContent: "flex-end",
          }}
        >
          <Image
            source={title.banner}
            accessible={false}
            contentFit="cover"
            style={{ position: "absolute", inset: 0 }}
            onError={() => setFailedImage(title.banner)}
          />
          <LinearGradient
            colors={[
              "transparent",
              "rgba(0,0,0,.12)",
              "rgba(0,0,0,.78)",
              "rgba(0,0,0,.94)",
            ]}
            locations={[0, 0.35, 0.72, 1]}
            style={{ position: "absolute", inset: 0 }}
          />
          <View style={{ padding: 16, backgroundColor: "rgba(0,0,0,.32)" }}>
            {details}
          </View>
        </View>
      ) : (
        <View
          style={{
            padding: 12,
            gap: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Artwork
            title={title}
            width={fontScale >= 1.5 ? 64 : 96}
            decorative
          />
          {details}
        </View>
      )}
    </Pressable>
  );
}
