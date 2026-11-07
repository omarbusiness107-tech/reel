import React, { memo, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { queryClient } from "../providers/AppProvider";
import type { Title, Person } from "../core/types";
import { useTheme } from "../theme";
import { Copy } from "./ui";
import { posterUrls } from "../core/artwork";
import { resolvePosters } from "../services/catalog";
import { personRecord, personKey } from "../core/people";
export function openTitle(t: Title) {
  const id = t.catalogId || t.id;
  queryClient.setQueryData(["title-seed", id], t);
  router.push({ pathname: "/title/[id]", params: { id } });
}
export function openPerson(value: Person, work?: Title) {
  const p = personRecord(value);
  const key = personKey(p);
  queryClient.setQueryData(["person-seed", key], p);
  if (work) {
    const {
      id,
      catalogId,
      title,
      type,
      year,
      cover,
      genres,
      imdb,
      tvmaze,
      kitsu,
    } = work;
    queryClient.setQueryData(["person-context", key], {
      id,
      catalogId,
      title,
      type,
      year,
      cover,
      genres,
      imdb,
      tvmaze,
      kitsu,
    });
  }
  router.push({
    pathname: "/person/[id]",
    params: { id: key, name: p.name },
  });
}
export const Artwork = memo(function Artwork({
  title,
  width = 136,
}: {
  title: Title;
  width?: number;
}) {
  return (
    <Poster
      key={`${title.catalogId || title.id}:${title.cover || ""}`}
      title={title}
      width={width}
    />
  );
});
function Poster({ title, width }: { title: Title; width: number }) {
  const c = useTheme();
  const [failed, setFailed] = useState<string[]>([]);
  const recovered = useQuery({
    queryKey: [
      "poster-recovery",
      title.catalogId || title.id,
      title.cover || "",
    ],
    queryFn: ({ signal }) => resolvePosters(title, signal),
    enabled: !title.cover || failed.length > 0,
    staleTime: 86400000,
    retry: 1,
  });
  const uri = posterUrls(title, recovered.data).find(
    (url) => !failed.includes(url),
  );
  return (
    <View
      style={{
        width,
        aspectRatio: 2 / 3,
        borderRadius: 10,
        backgroundColor: c.raised,
        overflow: "hidden",
      }}
    >
      {uri ? (
        <Image
          key={uri}
          source={{ uri }}
          recyclingKey={uri}
          accessibilityLabel={`Poster for ${title.title}`}
          accessible
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={0}
          onError={() =>
            setFailed((previous) =>
              previous.includes(uri) ? previous : [...previous, uri],
            )
          }
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel={`Poster unavailable for ${title.title}`}
          accessibilityRole="image"
        >
          <Ionicons
            name="film-outline"
            size={Math.min(32, width / 3)}
            color={c.muted}
          />
        </View>
      )}
    </View>
  );
}
export const TitleCard = memo(function TitleCard({
  title,
  width = 136,
}: {
  title: Title;
  width?: number;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Details for ${title.title}${title.year ? `, ${title.year}` : ""}`}
      onPress={() => openTitle(title)}
      style={{ width, gap: 8 }}
    >
      <Artwork title={title} width={width} />
      <Copy
        numberOfLines={2}
        style={{ fontSize: 14, fontWeight: "600", lineHeight: 19 }}
      >
        {title.title}
      </Copy>
      <Copy kind="small" style={{ color: c.muted }}>
        {title.year || "Year unknown"} ·{" "}
        {title.type === "series" ? "TV" : title.type}
        {title.score ? ` · ★ ${title.score.toFixed(1)}` : ""}
      </Copy>
    </Pressable>
  );
});
export function Shelf({ titles }: { titles: Title[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
    >
      {titles.map((t) => (
        <TitleCard key={t.catalogId || t.id} title={t} />
      ))}
    </ScrollView>
  );
}
export const TitleRow = memo(function TitleRow({
  title,
  subtitle,
  action,
}: {
  title: Title;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
        alignItems: "center",
      }}
    >
      <Pressable
        onPress={() => openTitle(title)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${title.title}`}
        style={{ flexDirection: "row", gap: 14, alignItems: "center", flex: 1 }}
      >
        <Artwork title={title} width={64} />
        <View style={{ gap: 5, flex: 1 }}>
          <Copy style={{ fontWeight: "600" }}>{title.title}</Copy>
          <Copy kind="small" style={{ color: c.muted }}>
            {title.year || "Unknown year"} · {title.type}
          </Copy>
          {subtitle ? (
            <Copy kind="small" style={{ color: c.mint }}>
              {subtitle}
            </Copy>
          ) : null}
        </View>
      </Pressable>
      {action}
    </View>
  );
});
