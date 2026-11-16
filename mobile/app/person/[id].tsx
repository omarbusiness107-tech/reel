import React, { useState } from "react";
import { View, FlatList, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { personFromRoute, personKey } from "../../src/core/people";
import { getPersonProfile, getPersonCredits } from "../../src/services/people";
import type { Person, Title } from "../../src/core/types";
import { searchCore } from "../../src/core/shared";
import {
  Page,
  usePageLayout,
  Copy,
  BackHeader,
  ErrorNote,
  State,
  Button,
} from "../../src/components/ui";
import { TitleCard } from "../../src/components/TitleCard";
import { Portrait } from "../../src/components/People";
import { useTheme } from "../../src/theme";

export default function PersonScreen() {
  const {
    id = "",
    provider,
    name,
  } = useLocalSearchParams<{ id: string; provider?: string; name?: string }>();
  const c = useTheme();
  const { available, fontScale } = usePageLayout();
  const compact = available < 360 || fontScale >= 1.5;
  const [showBio, setShowBio] = useState(false);
  const client = useQueryClient();
  const identity = personFromRoute(id, provider, name);
  const key = personKey(identity);
  const seed = client.getQueryData<Person>(["person-seed", key]) || identity;
  const context = client.getQueryData<Title>(["person-context", key]);
  const profile = useQuery({
    queryKey: ["person-profile", key],
    queryFn: ({ signal }) => getPersonProfile(seed, signal),
    staleTime: 86400000,
    retry: 1,
  });
  const person = profile.data?.person || seed;
  const credits = useQuery({
    queryKey: ["person-credits", key],
    queryFn: ({ signal }) => getPersonCredits(profile.data!, signal),
    enabled: !!profile.data,
    staleTime: 3600000,
    retry: 1,
  });
  const works = searchCore
    .dedupe([...(context ? [context] : []), ...(credits.data || [])])
    .slice(0, 60);
  const loadingCredits = profile.isPending || credits.isLoading;
  return (
    <Page>
      <BackHeader title="People" />
      <View
        style={{
          flexDirection: compact ? "column" : "row",
          gap: 20,
          alignItems: "center",
        }}
      >
        <Portrait person={person} size={112} />
        <View
          style={{
            flex: compact ? undefined : 1,
            width: compact ? "100%" : undefined,
            gap: 8,
          }}
        >
          <Copy kind="headline" accessibilityRole="header">
            {person.name || "Person profile"}
          </Copy>
          {person.country ? (
            <Copy style={{ color: c.muted }}>{person.country}</Copy>
          ) : null}
        </View>
      </View>
      {profile.isPending ? (
        <Copy style={{ color: c.muted }}>Loading the profile...</Copy>
      ) : null}
      <ErrorNote error={profile.error} retry={() => void profile.refetch()} />
      {person.birthday ? (
        <View style={{ gap: 5 }}>
          <Copy kind="small" style={{ color: c.muted }}>
            Born
          </Copy>
          <Copy>{person.birthday}</Copy>
        </View>
      ) : null}
      {profile.data?.bio || person.role ? (
        <View style={{ gap: 10 }}>
          <Copy kind="title">About</Copy>
          <Copy
            style={{ color: c.secondary }}
            numberOfLines={showBio ? undefined : 5}
          >
            {profile.data?.bio || person.role}
          </Copy>
          {(profile.data?.bio?.length || 0) > 250 ? (
            <Button
              label={showBio ? "Show less" : "Read more"}
              variant="quiet"
              onPress={() => setShowBio(!showBio)}
            />
          ) : null}
        </View>
      ) : null}
      <View style={{ gap: 16 }}>
        <Copy kind="title">Available credits</Copy>
        {loadingCredits ? (
          <Copy kind="small" style={{ color: c.muted }}>
            Finding available credits...
          </Copy>
        ) : null}
        <ErrorNote error={credits.error} retry={() => void credits.refetch()} />
        {works.length ? (
          <FlatList
            horizontal
            data={works}
            keyExtractor={(work) => work.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14 }}
            renderItem={({ item }) => <TitleCard title={item} width={144} />}
            initialNumToRender={4}
            windowSize={3}
          />
        ) : !loadingCredits ? (
          <State
            title="More stories to discover"
            body="This provider has no available credits for this person right now. Their profile remains available above."
          />
        ) : null}
        <Copy kind="small" style={{ color: c.muted }}>
          Available credits and known-for titles from public catalogs.
          Filmographies may be incomplete.
        </Copy>
      </View>
      <View style={{ gap: 4 }}>
        {(
          profile.data?.sources ||
          (person.sourceUrl
            ? [
                {
                  label: person.provider === "imdb" ? "IMDb" : "TVMaze",
                  url: person.sourceUrl,
                },
              ]
            : [])
        ).map((source) => (
          <Button
            key={source.url}
            label={`View on ${source.label}`}
            icon="open-outline"
            variant="quiet"
            onPress={() => void Linking.openURL(source.url)}
          />
        ))}
      </View>
    </Page>
  );
}
