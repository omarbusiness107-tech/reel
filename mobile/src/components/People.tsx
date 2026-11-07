import React, { useState } from "react";
import { FlatList, View, Pressable } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { personRecord, personKey } from "../core/people";
import type { Person, Title } from "../core/types";
import { resolveActor, getPersonProfile } from "../services/people";
import { useTheme } from "../theme";
import { Copy } from "./ui";
import { openPerson } from "./TitleCard";

export function Portrait({
  person,
  size = 84,
}: {
  person: Person;
  size?: number;
}) {
  const c = useTheme();
  const [failed, setFailed] = useState<string[]>([]);
  const profile = useQuery({
    queryKey: ["person-profile", personKey(person)],
    queryFn: ({ signal }) => getPersonProfile(person, signal),
    enabled:
      (!person.image || failed.includes(person.image)) &&
      person.provider !== "name",
    staleTime: 86400000,
    retry: 1,
  });
  const image = [
    person.image,
    ...(person.imageCandidates || []),
    profile.data?.person.image,
    ...(profile.data?.person.imageCandidates || []),
  ].find((url) => url && !failed.includes(url));
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: c.raised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {image && !failed.includes(image) ? (
        <Image
          key={image}
          source={image}
          style={{ width: size, height: size }}
          contentFit="cover"
          contentPosition="top"
          accessibilityLabel={`Portrait of ${person.name}`}
          accessible
          onError={() => setFailed((urls) => [...urls, image])}
        />
      ) : (
        <Ionicons
          name="person-outline"
          size={size * 0.4}
          color={c.muted}
          accessibilityLabel={`Portrait unavailable for ${person.name}`}
        />
      )}
    </View>
  );
}
function CastMember({ person: value, work }: { person: Person; work: Title }) {
  const c = useTheme();
  const resolved = useQuery({
    queryKey: ["actor-identity", personKey(value)],
    queryFn: ({ signal }) => resolveActor(value, signal),
    staleTime: 86400000,
    retry: 1,
    enabled: value.provider === "name",
  });
  const person = resolved.data || value;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`About ${person.name}`}
      onPress={() => openPerson(person, work)}
      style={{ width: 106, alignItems: "center", gap: 10, paddingBottom: 4 }}
    >
      <Portrait person={person} />
      <Copy
        style={{
          fontSize: 13,
          lineHeight: 18,
          fontWeight: "600",
          textAlign: "center",
          width: "100%",
        }}
      >
        {person.name}
      </Copy>
      {value.role && !/actor|actress/i.test(value.role) ? (
        <Copy kind="small" style={{ color: c.muted, textAlign: "center" }}>
          {value.role}
        </Copy>
      ) : null}
    </Pressable>
  );
}
export function CastRail({ title }: { title: Title }) {
  const cast = title.people?.length ? title.people : title.cast || [];
  const records = [
    ...new Map(
      cast.map((p) => {
        const person = personRecord(p);
        return [personKey(person), person] as const;
      }),
    ).values(),
  ];
  if (!records.length) return null;
  return (
    <View style={{ gap: 18 }}>
      <Copy kind="title">Cast & creators</Copy>
      <FlatList
        horizontal
        data={records}
        keyExtractor={personKey}
        renderItem={({ item }) => <CastMember person={item} work={title} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
        accessibilityLabel="Cast and creators, swipe horizontally"
      />
    </View>
  );
}
