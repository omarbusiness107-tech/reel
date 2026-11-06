import React from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { personDetails } from "../../src/services/catalog";
import {
  Page,
  Copy,
  BackHeader,
  Loading,
  ErrorNote,
  State,
  Section,
} from "../../src/components/ui";
import { TitleRow } from "../../src/components/TitleCard";
import { useTheme } from "../../src/theme";
export default function Person() {
  const { id, provider } = useLocalSearchParams<{
    id: string;
    provider: string;
  }>();
  const c = useTheme();
  const person = useQuery({
    queryKey: ["person", provider, id],
    queryFn: ({ signal }) => personDetails(provider, id, signal),
  });
  return (
    <Page>
      <BackHeader title="People & stories" />
      {person.isPending ? <Loading label="Finding their stories…" /> : null}
      <ErrorNote error={person.error} retry={() => void person.refetch()} />
      {person.data ? (
        <>
          <View style={{ gap: 16 }}>
            {person.data.person.image ? (
              <Image
                source={person.data.person.image}
                contentFit="cover"
                style={{ height: 180, width: 140, borderRadius: 16 }}
              />
            ) : null}
            <Copy kind="hero">{person.data.person.name}</Copy>
            <Copy style={{ color: c.muted }}>
              {person.data.bio || "Film and television credits"}
            </Copy>
          </View>
          <Section
            title="A body of work"
            kicker={
              provider === "tvmaze"
                ? "TVMaze credits"
                : "Wikidata credits · IMDb catalog"
            }
          >
            {person.data.works.length ? (
              person.data.works.map((t) => <TitleRow key={t.id} title={t} />)
            ) : (
              <State
                title="No catalog credits available"
                body="This source has no resolvable film or television credits for this person."
              />
            )}
          </Section>
          <Copy kind="small" style={{ color: c.muted }}>
            Credits reflect this provider’s available records and may be
            incomplete.
          </Copy>
        </>
      ) : null}
    </Page>
  );
}
