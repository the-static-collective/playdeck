import {
  mkdirSync,
} from "node:fs";
import {join} from "node:path";
import type {
  CardSpec,
  CompositionEvent,
  CompositionPlan,
} from "@playdeck/core";
import {runFfmpeg} from "./ffmpeg";
import type {
  AwakeningArtifact,
  MaterializeAwakeningsInput,
  MaterializeAwakeningsResult,
} from "./types";

const unique = (values: string[]) => [...new Set(values)];

const copyEvent = (event: CompositionEvent): CompositionEvent => ({
  ...event,
  cards: event.cards ? [...event.cards] : undefined,
  with: event.with ? [...event.with] : undefined,
  params: event.params ? {...event.params} : undefined,
});

export const materializeAwakenings = ({
  deck,
  plan,
  sourceFiles,
  outputDir,
}: MaterializeAwakeningsInput): MaterializeAwakeningsResult => {
  mkdirSync(outputDir, {recursive: true});

  const cardById = new Map(deck.cards.map((card) => [card.id, card]));
  const events = plan.events.map(copyEvent);
  const artifacts: AwakeningArtifact[] = [];
  const assetSources: Record<string, string> = {};
  const newCards: CardSpec[] = [];

  for (const event of events) {
    if (event.type !== "awaken") continue;

    const sourceCardId =
      typeof event.params?.sourceCardId === "string"
        ? event.params.sourceCardId
        : event.cards?.[0];
    const newCardId =
      typeof event.params?.newCardId === "string"
        ? event.params.newCardId
        : undefined;

    if (!sourceCardId || !newCardId) {
      throw new Error(
        `Awakening event "${event.id}" lacks sourceCardId/newCardId.`,
      );
    }

    const sourceCard = cardById.get(sourceCardId);
    if (!sourceCard) {
      throw new Error(
        `Awakening event "${event.id}" references missing source card "${sourceCardId}".`,
      );
    }

    const logicalSource = sourceCard.front?.source ?? sourceCard.source;
    const localSource = sourceFiles[logicalSource];
    if (!localSource) {
      throw new Error(
        `No local source binding for awakening card "${sourceCardId}" (${logicalSource}).`,
      );
    }

    const duration = Math.max(1 / plan.fps, event.duration ?? 1);
    const eventDir = join(outputDir, newCardId);
    mkdirSync(eventDir, {recursive: true});

    const videoFile = join(eventDir, "awakening.mp4");
    const freezeFile = join(eventDir, "freeze.png");
    const videoSource =
      `asset://${deck.id}/__awakening/${newCardId}.mp4`;
    const freezeSource =
      `asset://${deck.id}/__awakening/${newCardId}.png`;

    const width = Math.max(320, Math.round(plan.width / 2));
    const height = Math.max(180, Math.round(plan.height / 2));

    runFfmpeg([
      "-loop",
      "1",
      "-i",
      localSource,
      "-vf",
      `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='min(zoom+0.0025,1.14)':x='iw/2-(iw/zoom/2)+sin(on/7)*5':y='ih/2-(ih/zoom/2)+cos(on/9)*4':d=1:s=${width}x${height}:fps=${plan.fps},eq=contrast=1.06:saturation=1.08,format=yuv420p`,
      "-t",
      duration.toFixed(3),
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      videoFile,
    ]);

    runFfmpeg([
      "-sseof",
      "-0.08",
      "-i",
      videoFile,
      "-frames:v",
      "1",
      freezeFile,
    ]);

    const newCard: CardSpec = {
      id: newCardId,
      source: freezeSource,
      front: {source: freezeSource},
      traits: unique([
        ...(sourceCard.traits ?? []),
        "awakened",
        "descendant",
        "freeze-frame",
      ]),
      temperament: unique([
        ...(sourceCard.temperament ?? []),
        "new",
        "echoing",
      ]),
      relationships: [
        ...(sourceCard.relationships ?? []),
        {
          target: sourceCardId,
          kind: "froze-from",
          notes: `Materialized by ${event.id}`,
        },
      ],
      permissions: {
        ...(sourceCard.permissions ?? {}),
        awaken: false,
      },
      metadata: {
        awakening: {
          sourceCardId,
          eventId: event.id,
          provider: "deterministic-echo-v1",
          videoSource,
          freezeSource,
        },
      },
    };

    event.params = {
      ...(event.params ?? {}),
      provider: "deterministic-echo-v1",
      videoSource,
      freezeSource,
    };

    const freezeEvent = events.find(
      (candidate) =>
        candidate.type === "freeze" &&
        candidate.params?.newCardId === newCardId,
    );
    if (freezeEvent) {
      freezeEvent.params = {
        ...(freezeEvent.params ?? {}),
        provider: "deterministic-echo-v1",
        videoSource,
        freezeSource,
      };
    }

    artifacts.push({
      eventId: event.id,
      sourceCardId,
      provider: "deterministic-echo-v1",
      duration,
      videoSource,
      freezeSource,
      videoFile,
      freezeFile,
      newCard,
    });
    newCards.push(newCard);
    assetSources[videoSource] = videoFile;
    assetSources[freezeSource] = freezeFile;
  }

  return {
    plan: {
      ...plan,
      events,
      finalState: {
        ...(plan.finalState ?? {}),
        newCards: [...(plan.finalState?.newCards ?? [])],
      },
      metadata: {
        ...(plan.metadata ?? {}),
        materializedAwakenings: artifacts.map((artifact) => ({
          eventId: artifact.eventId,
          sourceCardId: artifact.sourceCardId,
          newCardId: artifact.newCard.id,
          provider: artifact.provider,
        })),
      },
    },
    artifacts,
    newCards,
    assetSources,
  };
};
