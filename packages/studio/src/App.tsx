import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {Player, type PlayerRef} from "@remotion/player";
import type {
  CardSpec,
  DeckSpec,
  PerformanceReceipt,
  SectionGate,
  TrackSpec,
  WorldRule,
} from "@playdeck/core";
import {PlaydeckComposition} from "@playdeck/render-remotion";
import {
  loadBrowserBundle,
  type BrowserStudioBundle,
} from "./browserBundle";
import {downloadJson} from "./download";
import {
  assetPayloadToObjectUrl,
  buildStudioCommitPayload,
  collectStudioAssets,
  commitStudioPerformance,
  fileToPayload,
  prepareStudioNextSong,
} from "./cockpitClient";
import type {
  StudioAssetPayload,
  StudioCommitResult,
  StudioQueuedSong,
} from "./cockpitTypes";
import {recomposeStudioPlan} from "./recompose";
import {TimelineTree} from "./TimelineTree";
import {
  compareStudioBranchCheckpoints,
  composeStudioRelationBranch,
  type StudioBranchRelation,
} from "./branchRelation";
import {
  appendStudioTimelineCheckpoint,
  buildStudioTimelineGraph,
  createStudioSessionArchive,
  emptyStudioTimeline,
  ensureStudioTimeline,
  forkStudioSessionArchive,
  mergeStudioTimelineLedgers,
  parseStudioSessionArchive,
  restoreStudioSessionAtCheckpoint,
  type StudioTimelineNode,
} from "./sessionArchive";
import {
  enqueueStudioSongs,
  moveStudioQueuedSong,
  removeStudioQueuedSong,
} from "./sessionQueue";
import type {StudioBundle} from "./types";

const splitTags = (value: string) =>
  [...new Set(
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  )];

const moveCard = (
  deck: DeckSpec,
  cardId: string,
  delta: -1 | 1,
): DeckSpec => {
  const order = deck.order?.length
    ? [...deck.order]
    : deck.cards.map((card) => card.id);
  const index = order.indexOf(cardId);
  const target = index + delta;

  if (index < 0 || target < 0 || target >= order.length) {
    return deck;
  }

  [order[index], order[target]] = [order[target], order[index]];
  return {...deck, order};
};

const cardImage = (
  card: CardSpec,
  assets: Record<string, string>,
) => assets[card.front?.source ?? card.source];

const worldFields: Array<keyof Pick<
  WorldRule,
  "physical" | "surface" | "transition" | "awakening"
>> = [
  "physical",
  "surface",
  "transition",
  "awakening",
];

export const App: React.FC = () => {
  const player = useRef<PlayerRef>(null);
  const [loaded, setLoaded] =
    useState<BrowserStudioBundle | null>(null);
  const [session, setSession] =
    useState<StudioBundle | null>(null);
  const [selectedCard, setSelectedCard] =
    useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [inheritAfterRender, setInheritAfterRender] = useState(true);
  const [lastCommit, setLastCommit] =
    useState<StudioCommitResult | null>(null);
  const [runtimeAssets, setRuntimeAssets] =
    useState<Record<string, StudioAssetPayload>>({});
  const [runtimeAssetUrls, setRuntimeAssetUrls] =
    useState<Record<string, string>>({});
  const [preparingNext, setPreparingNext] = useState(false);
  const [albumQueue, setAlbumQueue] =
    useState<StudioQueuedSong[]>([]);
  const [receiptHistory, setReceiptHistory] =
    useState<PerformanceReceipt[]>([]);
  const [timeline, setTimeline] =
    useState(emptyStudioTimeline);
  const [selectedTimelineNodeId, setSelectedTimelineNodeId] =
    useState<string | null>(null);
  const [compareLeftCheckpointId, setCompareLeftCheckpointId] =
    useState<string | null>(null);
  const [compareRightCheckpointId, setCompareRightCheckpointId] =
    useState<string | null>(null);
  const dynamicUrls = useRef<string[]>([]);

  useEffect(
    () => () => loaded?.dispose(),
    [loaded],
  );

  useEffect(
    () => () => {
      dynamicUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const assets = {
    ...(loaded?.assetUrls ?? {}),
    ...runtimeAssetUrls,
  };

  const selected = useMemo(
    () =>
      session?.deck.cards.find(
        (card) => card.id === selectedCard,
      ),
    [session, selectedCard],
  );

  const timelineGraph = useMemo(
    () => buildStudioTimelineGraph(timeline),
    [timeline],
  );
  const selectedTimelineNode = useMemo(
    () =>
      timelineGraph.nodes.find(
        (node) => node.id === selectedTimelineNodeId,
      ),
    [timelineGraph, selectedTimelineNodeId],
  );

  const branchComparison = useMemo<{
    relation: StudioBranchRelation | null;
    error: string | null;
  }>(() => {
    if (!compareLeftCheckpointId || !compareRightCheckpointId) {
      return {relation: null, error: null};
    }
    try {
      return {
        relation: compareStudioBranchCheckpoints(
          timeline,
          compareLeftCheckpointId,
          compareRightCheckpointId,
        ),
        error: null,
      };
    } catch (reason) {
      return {
        relation: null,
        error:
          reason instanceof Error ? reason.message : String(reason),
      };
    }
  }, [
    timeline,
    compareLeftCheckpointId,
    compareRightCheckpointId,
  ]);

  const setRecomposed = (
    next: {
      deck?: DeckSpec;
      track?: TrackSpec;
      worldRule?: WorldRule;
    },
  ) => {
    setSession((current) => {
      if (!current) return current;

      const deck = next.deck ?? current.deck;
      const track = next.track ?? current.track;
      const worldRule = next.worldRule ?? current.worldRule;

      return {
        ...current,
        deck,
        track,
        worldRule,
        plan: recomposeStudioPlan({
          deck,
          track,
          worldRule,
          priorPlan: current.plan,
        }),
      };
    });
    setDirty(true);
  };

  const onBundle = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    try {
      setError(null);
      const next = await loadBrowserBundle(files);
      loaded?.dispose();
      setLoaded(next);
      setSession(next);
      setSelectedCard(next.deck.order?.[0] ?? next.deck.cards[0]?.id ?? null);
      dynamicUrls.current.forEach((url) => URL.revokeObjectURL(url));
      dynamicUrls.current = [];
      setRuntimeAssets({});
      setRuntimeAssetUrls({});
      setAlbumQueue([]);
      setReceiptHistory(next.receipt ? [next.receipt] : []);
      setTimeline(emptyStudioTimeline());
      setSelectedTimelineNodeId(null);
      setCompareLeftCheckpointId(null);
      setCompareRightCheckpointId(null);
      setLastCommit(null);
      setDirty(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const captureCurrentArchive = async () => {
    if (!session) {
      throw new Error("No Studio session is open.");
    }

    const portableAssets = await collectStudioAssets(
      loaded,
      runtimeAssets,
    );

    return createStudioSessionArchive({
      session,
      assets: portableAssets,
      queue: albumQueue,
      receipts: receiptHistory,
      checkpoint: lastCommit
        ? {
            id: lastCommit.id,
            receipt: lastCommit.receipt,
            inheritedDeck: lastCommit.inheritedDeck,
          }
        : undefined,
      timeline,
      inheritAfterRender,
      dirty,
    });
  };

  const saveSession = async () => {
    if (!session) return;

    try {
      setError(null);
      const archive = await captureCurrentArchive();
      downloadJson(
        `${session.deck.id}.playdeck-session.json`,
        archive,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const restoreSessionArchive = (
    archive: ReturnType<typeof parseStudioSessionArchive>,
  ) => {
    loaded?.dispose();
    setLoaded(null);
    dynamicUrls.current.forEach((url) =>
      URL.revokeObjectURL(url),
    );
    dynamicUrls.current = [];

    const urls: Record<string, string> = {};
    for (const [logical, asset] of Object.entries(
      archive.assets,
    )) {
      const url = assetPayloadToObjectUrl(asset);
      dynamicUrls.current.push(url);
      urls[logical] = url;
    }

    setRuntimeAssets(archive.assets);
    setRuntimeAssetUrls(urls);
    setSession(archive.session);
    setAlbumQueue(archive.queue);
    setReceiptHistory(archive.receipts);
    setTimeline(ensureStudioTimeline(archive));
    setSelectedTimelineNodeId(
      archive.checkpoint
        ? `receipt:${archive.checkpoint.receipt.id}`
        : null,
    );
    setCompareLeftCheckpointId(null);
    setCompareRightCheckpointId(null);
    setInheritAfterRender(
      archive.preferences.inheritAfterRender,
    );
    setDirty(archive.dirty);
    setLastCommit(
      archive.checkpoint
        ? {
            id: archive.checkpoint.id,
            outputDir: "session://portable",
            video: "session://portable",
            receipt: archive.checkpoint.receipt,
            inheritedDeck:
              archive.checkpoint.inheritedDeck,
            newAssets: {},
          }
        : null,
    );
    setSelectedCard(
      archive.session.deck.order?.[0] ??
        archive.session.deck.cards[0]?.id ??
        null,
    );
    player.current?.seekTo(0);
  };

  const openSession = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      restoreSessionArchive(
        parseStudioSessionArchive(await file.text()),
      );
      event.target.value = "";
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const importTimelineSessions = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      setError(null);
      const peers = await Promise.all(
        files.map(async (file) =>
          parseStudioSessionArchive(await file.text()),
        ),
      );
      setTimeline((current) =>
        mergeStudioTimelineLedgers(
          current,
          ...peers.map((peer) =>
            ensureStudioTimeline(peer),
          ),
        ),
      );
      event.target.value = "";
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const jumpTimeline = async (
    checkpointId: string,
  ) => {
    try {
      setError(null);
      const source = await captureCurrentArchive();
      const restored = restoreStudioSessionAtCheckpoint(
        source,
        checkpointId,
      );
      restoreSessionArchive(restored);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const forkTimeline = async (
    checkpointId?: string,
  ) => {
    if (!session) return;

    const label = window.prompt(
      "Name this future branch:",
      "alternate-world",
    );
    if (!label?.trim()) return;

    try {
      setError(null);
      const source = await captureCurrentArchive();
      const forked = forkStudioSessionArchive(
        source,
        label,
        checkpointId,
      );

      downloadJson(
        `${session.deck.id}--${forked.branch?.id ?? "branch"}.playdeck-session.json`,
        forked,
      );
      restoreSessionArchive(forked);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const composeRelationTimeline = async () => {
    const relation = branchComparison.relation;
    if (!session || !relation) return;

    const label = window.prompt(
      "Name the future composed from this branch relation:",
      "relation-world",
    );
    if (!label?.trim()) return;

    try {
      setError(null);
      const source = await captureCurrentArchive();
      const composed = composeStudioRelationBranch(
        source,
        relation,
        label,
      );

      downloadJson(
        `${relation.id}.branch-relation.json`,
        relation,
      );
      downloadJson(
        `${session.deck.id}--${composed.branch?.id ?? "relation"}.playdeck-session.json`,
        composed,
      );
      restoreSessionArchive(composed);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const commitPerformance = async () => {
    if (!session || committing) return;

    try {
      setError(null);
      setCommitting(true);
      const payload = await buildStudioCommitPayload({
        loaded,
        session,
        inherit: inheritAfterRender,
        extraAssets: runtimeAssets,
      });
      const result = await commitStudioPerformance(payload);
      const nextReceipts = [
        ...receiptHistory.filter(
          (receipt) => receipt.id !== result.receipt.id,
        ),
        result.receipt,
      ];
      const nextRuntimeAssets = {
        ...runtimeAssets,
        ...result.newAssets,
      };

      setLastCommit(result);
      setReceiptHistory(nextReceipts);

      if (result.inheritedDeck) {
        const portableAssets = await collectStudioAssets(
          loaded,
          nextRuntimeAssets,
        );
        const branchMarker =
          session.deck.metadata?.studioBranch;
        const branchId =
          branchMarker &&
          typeof branchMarker === "object" &&
          !Array.isArray(branchMarker) &&
          typeof (branchMarker as Record<string, unknown>).id ===
            "string"
            ? String(
                (branchMarker as Record<string, unknown>).id,
              )
            : undefined;
        const parentReceiptId =
          session.deck.inheritedReceipt?.startsWith("receipt:")
            ? session.deck.inheritedReceipt.slice(
                "receipt:".length,
              )
            : undefined;

        setTimeline((current) =>
          appendStudioTimelineCheckpoint(current, {
            id: result.id,
            receipt: result.receipt,
            inheritedDeck: result.inheritedDeck!,
            parentReceiptId,
            branchId,
            state: {
              session: {
                ...session,
                receipt: result.receipt,
              },
              assets: portableAssets,
              queue: albumQueue,
              receipts: nextReceipts,
              preferences: {
                inheritAfterRender,
              },
              dirty: false,
            },
          }),
        );
        setSelectedTimelineNodeId(
          `receipt:${result.receipt.id}`,
        );
      }

      if (Object.keys(result.newAssets).length > 0) {
        setRuntimeAssets((current) => ({
          ...current,
          ...result.newAssets,
        }));
        const urls: Record<string, string> = {};
        for (const [logical, asset] of Object.entries(result.newAssets)) {
          const url = assetPayloadToObjectUrl(asset);
          dynamicUrls.current.push(url);
          urls[logical] = url;
        }
        setRuntimeAssetUrls((current) => ({
          ...current,
          ...urls,
        }));
      }

      setSession((current) =>
        current
          ? {...current, receipt: result.receipt}
          : current,
      );
      setDirty(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    } finally {
      setCommitting(false);
    }
  };

  const addAlbumSongs = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      setError(null);
      const audio = await Promise.all(files.map(fileToPayload));
      setAlbumQueue((current) =>
        enqueueStudioSongs(current, audio),
      );
      event.target.value = "";
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const prepareQueuedSong = async () => {
    const queued = albumQueue[0];
    if (
      !queued ||
      !session ||
      !lastCommit?.inheritedDeck ||
      preparingNext
    ) {
      return;
    }

    try {
      setError(null);
      setPreparingNext(true);
      const next = await prepareStudioNextSong({
        deck: lastCommit.inheritedDeck,
        worldRule: session.worldRule,
        priorPlan: session.plan,
        audio: queued.audio,
      });

      const audioUrl = assetPayloadToObjectUrl(queued.audio);
      dynamicUrls.current.push(audioUrl);

      setRuntimeAssets((current) => ({
        ...current,
        [next.track.source]: next.audioAsset,
      }));
      setRuntimeAssetUrls((current) => ({
        ...current,
        [next.track.source]: audioUrl,
      }));

      const inheritedDeck = lastCommit.inheritedDeck;
      setSession((current) =>
        current
          ? {
              ...current,
              deck: inheritedDeck,
              track: next.track,
              envelope: next.envelope,
              plan: next.plan,
              receipt: undefined,
            }
          : current,
      );
      setSelectedCard(
        inheritedDeck.order?.[0] ??
          inheritedDeck.cards[0]?.id ??
          null,
      );
      setAlbumQueue((current) => current.slice(1));
      setLastCommit(null);
      setDirty(true);
      player.current?.seekTo(0);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    } finally {
      setPreparingNext(false);
    }
  };

  const updateSelected = (
    patch: Partial<CardSpec>,
  ) => {
    if (!session || !selected) return;

    const deck: DeckSpec = {
      ...session.deck,
      cards: session.deck.cards.map((card) =>
        card.id === selected.id ? {...card, ...patch} : card,
      ),
    };
    setRecomposed({deck});
  };

  const updateGate = (
    gateId: string,
    at: number,
  ) => {
    if (!session) return;

    const sourceGates: SectionGate[] =
      session.track.gates?.length
        ? session.track.gates
        : session.plan.gates;

    const gates = sourceGates
      .map((gate) =>
        gate.id === gateId
          ? {
              ...gate,
              at: Math.max(
                0,
                Math.min(session.track.duration - 0.001, at),
              ),
            }
          : gate,
      )
      .sort((a, b) => a.at - b.at);

    setRecomposed({
      track: {...session.track, gates},
    });
  };

  if (!session) {
    return (
      <main className="landing">
        <section className="landing-card">
          <div className="eyebrow">PLAYDECK / STUDIO 008</div>
          <h1>Open the room.</h1>
          <p>
            Load any PlayDeck output bundle. Studio reconstructs its
            logical media, receipt, composition plan, and deck without
            inventing a second file format.
          </p>
          <div className="landing-actions">
            <label className="bundle-button">
              Choose PlayDeck bundle
              <input
                type="file"
                multiple
                {...({webkitdirectory: ""} as Record<string, string>)}
                onChange={onBundle}
              />
            </label>
            <label className="bundle-button session-open-button">
              Resume Studio session
              <input
                type="file"
                accept=".json,.playdeck-session.json,application/json"
                onChange={openSession}
              />
            </label>
          </div>
          {error ? <div className="error">{error}</div> : null}
          <div className="landing-law">
            PLAN ≠ RENDER · PREVIEW ≠ RECEIPT · OVERRIDE ≠ HISTORY
          </div>
        </section>
      </main>
    );
  }

  const currentPlan = session.plan;
  const orderedIds = session.deck.order?.length
    ? session.deck.order
    : session.deck.cards.map((card) => card.id);
  const orderedCards = orderedIds
    .map((id) => session.deck.cards.find((card) => card.id === id))
    .filter((card): card is CardSpec => Boolean(card));

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">PLAYDECK / STUDIO 008</div>
          <h1>{session.deck.title ?? session.deck.id}</h1>
        </div>
        <div className="top-actions">
          <span className={dirty ? "badge dirty" : "badge"}>
            {dirty ? "LOCAL RECOMPOSITION" : "WITNESSED BUNDLE"}
          </span>
          <label className="compact-button">
            Open bundle
            <input
              type="file"
              multiple
              {...({webkitdirectory: ""} as Record<string, string>)}
              onChange={onBundle}
            />
          </label>
          <label className="compact-button">
            Resume session
            <input
              type="file"
              accept=".json,.playdeck-session.json,application/json"
              onChange={openSession}
            />
          </label>
          <button
            className="compact-button"
            onClick={saveSession}
          >
            Save session
          </button>
          <button
            className="branch-button"
            disabled={!lastCommit?.inheritedDeck}
            onClick={() => forkTimeline()}
            title={
              lastCommit?.inheritedDeck
                ? "Fork a new future from this sealed checkpoint."
                : "Render + seal a checkpoint before branching."
            }
          >
            Fork timeline
          </button>
          <button
            className="compact-button"
            onClick={() =>
              downloadJson("studio-deck.json", session.deck)
            }
          >
            Export deck
          </button>
          <button
            className="compact-button"
            onClick={() =>
              downloadJson("studio-plan.json", currentPlan)
            }
          >
            Export plan
          </button>
          <label className="inherit-toggle">
            <input
              type="checkbox"
              checked={inheritAfterRender}
              onChange={(event) =>
                setInheritAfterRender(event.target.checked)
              }
            />
            prepare next deck
          </label>
          <button
            className="commit-button"
            disabled={committing}
            onClick={commitPerformance}
          >
            {committing ? "Rendering…" : "Render + seal"}
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="panel deck-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">DECK</span>
              <strong>{session.deck.cards.length} cards</strong>
            </div>
            <span>{session.deck.inheritedReceipt ?? "fresh"}</span>
          </div>

          <div className="card-grid">
            {orderedCards.map((card, index) => (
              <button
                key={card.id}
                className={
                  card.id === selectedCard
                    ? "card-thumb selected"
                    : "card-thumb"
                }
                onClick={() => setSelectedCard(card.id)}
              >
                {cardImage(card, assets) ? (
                  <img src={cardImage(card, assets)} alt="" />
                ) : (
                  <div className="missing-art">NO LOCAL ART</div>
                )}
                <span>{String(index + 1).padStart(2, "0")}</span>
                <small>{card.id}</small>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="inspector">
              <div className="inspector-title">
                <strong>{selected.id}</strong>
                <div>
                  <button
                    onClick={() =>
                      setRecomposed({
                        deck: moveCard(
                          session.deck,
                          selected.id,
                          -1,
                        ),
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    onClick={() =>
                      setRecomposed({
                        deck: moveCard(
                          session.deck,
                          selected.id,
                          1,
                        ),
                      })
                    }
                  >
                    ↓
                  </button>
                </div>
              </div>

              <label>
                Traits
                <input
                  value={(selected.traits ?? []).join(", ")}
                  onChange={(event) =>
                    updateSelected({
                      traits: splitTags(event.target.value),
                    })
                  }
                />
              </label>

              <label>
                Temperament
                <input
                  value={(selected.temperament ?? []).join(", ")}
                  onChange={(event) =>
                    updateSelected({
                      temperament: splitTags(event.target.value),
                    })
                  }
                />
              </label>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={selected.permissions?.awaken ?? false}
                  onChange={(event) =>
                    updateSelected({
                      permissions: {
                        ...(selected.permissions ?? {}),
                        awaken: event.target.checked,
                      },
                    })
                  }
                />
                May awaken
              </label>
            </div>
          ) : null}
        </aside>

        <section className="center-column">
          <div className="preview-frame">
            <Player
              ref={player}
              component={PlaydeckComposition}
              inputProps={{
                deck: session.deck,
                track: session.track,
                worldRule: session.worldRule,
                plan: currentPlan,
                assets,
                envelope: session.envelope,
                debug: false,
              }}
              durationInFrames={Math.max(
                1,
                Math.ceil(
                  currentPlan.duration * currentPlan.fps,
                ),
              )}
              fps={currentPlan.fps}
              compositionWidth={currentPlan.width}
              compositionHeight={currentPlan.height}
              controls
              loop
              style={{
                width: "100%",
                aspectRatio: `${currentPlan.width} / ${currentPlan.height}`,
              }}
            />
          </div>

          <div className="timeline-tree-panel panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">TIMELINE TREE</span>
                <strong>
                  {timelineGraph.nodes.length} nodes · {timelineGraph.edges.length} crossings
                </strong>
              </div>
              <label className="timeline-import-button">
                Merge branch sessions
                <input
                  type="file"
                  multiple
                  accept=".json,.playdeck-session.json,application/json"
                  onChange={importTimelineSessions}
                />
              </label>
            </div>

            {timelineGraph.nodes.length > 0 ? (
              <>
                <TimelineTree
                  graph={timelineGraph}
                  selectedId={selectedTimelineNodeId}
                  activeReceiptId={
                    lastCommit?.receipt.id ??
                    session.receipt?.id
                  }
                  onSelect={(node: StudioTimelineNode) =>
                    setSelectedTimelineNodeId(node.id)
                  }
                />

                {selectedTimelineNode ? (
                  <div className="timeline-node-inspector">
                    <div>
                      <span>
                        {selectedTimelineNode.kind.toUpperCase()}
                      </span>
                      <strong>
                        {selectedTimelineNode.label}
                      </strong>
                    </div>
                    {selectedTimelineNode.checkpointId ? (
                      <div className="timeline-node-actions">
                        <button
                          onClick={() =>
                            jumpTimeline(
                              selectedTimelineNode.checkpointId!,
                            )
                          }
                        >
                          Jump here
                        </button>
                        <button
                          onClick={() =>
                            forkTimeline(
                              selectedTimelineNode.checkpointId!,
                            )
                          }
                        >
                          Fork here
                        </button>
                        {timeline.checkpoints.find(
                          (checkpoint) =>
                            checkpoint.id ===
                              selectedTimelineNode.checkpointId &&
                            checkpoint.branchId,
                        ) ? (
                          <>
                            <button
                              className={
                                compareLeftCheckpointId ===
                                selectedTimelineNode.checkpointId
                                  ? "compare-slot active"
                                  : "compare-slot"
                              }
                              onClick={() =>
                                setCompareLeftCheckpointId(
                                  selectedTimelineNode.checkpointId!,
                                )
                              }
                            >
                              Compare A
                            </button>
                            <button
                              className={
                                compareRightCheckpointId ===
                                selectedTimelineNode.checkpointId
                                  ? "compare-slot active"
                                  : "compare-slot"
                              }
                              onClick={() =>
                                setCompareRightCheckpointId(
                                  selectedTimelineNode.checkpointId!,
                                )
                              }
                            >
                              Compare B
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <small>
                        This node is visible provenance only; no portable
                        restart checkpoint is stored here.
                      </small>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="timeline-tree-empty">
                Render + seal with “prepare next deck” to create the
                first restartable timeline checkpoint.
              </div>
            )}
          </div>

          <div className="branch-comparison panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">CROSS-BRANCH RELATION</span>
                <strong>
                  {branchComparison.relation
                    ? branchComparison.relation.id
                    : "choose two branch checkpoints"}
                </strong>
              </div>
              {(compareLeftCheckpointId || compareRightCheckpointId) ? (
                <button
                  className="comparison-clear"
                  onClick={() => {
                    setCompareLeftCheckpointId(null);
                    setCompareRightCheckpointId(null);
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="comparison-slots">
              <div>
                <span>A</span>
                <strong>
                  {compareLeftCheckpointId ?? "not selected"}
                </strong>
              </div>
              <div>
                <span>B</span>
                <strong>
                  {compareRightCheckpointId ?? "not selected"}
                </strong>
              </div>
            </div>

            {branchComparison.error ? (
              <div className="comparison-error">
                {branchComparison.error}
              </div>
            ) : null}

            {branchComparison.relation ? (
              <>
                <div className="comparison-grid">
                  <div>
                    <span>same cards</span>
                    <strong>
                      {branchComparison.relation.cards.sharedUnchanged.length}
                    </strong>
                  </div>
                  <div>
                    <span>diverged cards</span>
                    <strong>
                      {branchComparison.relation.cards.sharedDiverged.length}
                    </strong>
                  </div>
                  <div>
                    <span>A only</span>
                    <strong>
                      {branchComparison.relation.cards.leftOnly.length}
                    </strong>
                  </div>
                  <div>
                    <span>B only</span>
                    <strong>
                      {branchComparison.relation.cards.rightOnly.length}
                    </strong>
                  </div>
                  <div>
                    <span>world differences</span>
                    <strong>
                      {branchComparison.relation.world.diverged.length}
                    </strong>
                  </div>
                  <div>
                    <span>shared checkpoint</span>
                    <strong>
                      {branchComparison.relation.common.receiptId}
                    </strong>
                  </div>
                </div>

                <div className="comparison-actions">
                  <button
                    onClick={() =>
                      downloadJson(
                        `${branchComparison.relation!.id}.branch-relation.json`,
                        branchComparison.relation!,
                      )
                    }
                  >
                    Export relation
                  </button>
                  <button
                    className="compose-relation-button"
                    onClick={composeRelationTimeline}
                  >
                    Compose third future
                  </button>
                </div>

                <div className="comparison-law">
                  Comparison observes both branches. The composed future
                  inherits only their latest shared witnessed checkpoint.
                </div>
              </>
            ) : (
              <div className="comparison-empty">
                Select a restartable node from one branch as Compare A,
                then a restartable node from another branch as Compare B.
              </div>
            )}
          </div>

          <div className="timeline panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">COMPOSITION</span>
                <strong>{currentPlan.events.length} events</strong>
              </div>
              <span>
                {currentPlan.duration.toFixed(2)}s · {currentPlan.fps}fps
              </span>
            </div>

            <div className="timeline-track">
              {currentPlan.events.map((event) => (
                <button
                  key={event.id}
                  className={`event-marker event-${event.type}`}
                  style={{
                    left: `${Math.max(
                      0,
                      Math.min(
                        100,
                        (event.at / currentPlan.duration) * 100,
                      ),
                    )}%`,
                  }}
                  title={`${event.type} @ ${event.at.toFixed(2)}s\n${event.because ?? ""}`}
                  onClick={() =>
                    player.current?.seekTo(
                      Math.round(event.at * currentPlan.fps),
                    )
                  }
                />
              ))}
            </div>

            <div className="gate-strip">
              {currentPlan.gates.map((gate) => (
                <button
                  key={gate.id}
                  onClick={() =>
                    player.current?.seekTo(
                      Math.round(gate.at * currentPlan.fps),
                    )
                  }
                >
                  <span>{gate.kind}</span>
                  <strong>{gate.at.toFixed(1)}s</strong>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="panel rules-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">WORLD</span>
              <strong>{session.worldRule.id}</strong>
            </div>
          </div>

          <div className="rule-fields">
            {worldFields.map((field) => (
              <label key={field}>
                {field}
                <input
                  value={session.worldRule[field] ?? ""}
                  onChange={(event) =>
                    setRecomposed({
                      worldRule: {
                        ...session.worldRule,
                        [field]: event.target.value || undefined,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>

          <div className="panel-heading secondary-heading">
            <div>
              <span className="panel-kicker">GATES</span>
              <strong>section timing</strong>
            </div>
          </div>

          <div className="gate-editor">
            {currentPlan.gates.map((gate) => (
              <label key={gate.id}>
                <span>
                  {gate.kind}
                  <small>{gate.label ?? gate.id}</small>
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={session.track.duration}
                  value={gate.at}
                  onChange={(event) =>
                    updateGate(
                      gate.id,
                      Number(event.target.value),
                    )
                  }
                />
              </label>
            ))}
          </div>

          {lastCommit ? (
            <div className="commit-result">
              <span className="panel-kicker">LAST COMMIT</span>
              <strong>{lastCommit.receipt.phase}</strong>
              <div>{lastCommit.id}</div>
              <div>{lastCommit.outputDir}</div>
              {lastCommit.inheritedDeck ? (
                <>
                  <div>
                    next deck: {lastCommit.inheritedDeck.cards.length} cards
                  </div>
                  <button
                    onClick={() =>
                      downloadJson(
                        "deck.after.json",
                        lastCommit.inheritedDeck,
                      )
                    }
                  >
                    Export next deck
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="album-session">
            <div className="album-session-heading">
              <div>
                <span className="panel-kicker">ALBUM SESSION</span>
                <strong>{session.track.title ?? session.track.id}</strong>
              </div>
              <span>
                {albumQueue.length} queued · {receiptHistory.length} receipts
              </span>
            </div>

            {(() => {
              const marker =
                session.deck.metadata?.studioBranch ??
                lastCommit?.inheritedDeck?.metadata?.studioBranch;
              if (
                !marker ||
                typeof marker !== "object" ||
                Array.isArray(marker)
              ) {
                return null;
              }
              const branch = marker as {
                id?: string;
                label?: string;
                forkedFromReceipt?: string;
              };
              return (
                <div className="branch-marker">
                  <span>BRANCH</span>
                  <strong>{branch.label ?? branch.id}</strong>
                  <small>
                    from {branch.forkedFromReceipt ?? "checkpoint"}
                  </small>
                </div>
              );
            })()}

            <label className="next-song-button">
              Add songs
              <input
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
                onChange={addAlbumSongs}
              />
            </label>

            {albumQueue.length > 0 ? (
              <div className="album-queue">
                {albumQueue.map((queued, index) => (
                  <div className="album-queue-item" key={queued.id}>
                    <span className="queue-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="queue-name">
                      <strong>{queued.name}</strong>
                      <small>
                        future audio · no plan yet
                      </small>
                    </div>
                    <div className="queue-actions">
                      <button
                        disabled={index === 0}
                        onClick={() =>
                          setAlbumQueue((current) =>
                            moveStudioQueuedSong(
                              current,
                              queued.id,
                              -1,
                            ),
                          )
                        }
                      >
                        ↑
                      </button>
                      <button
                        disabled={index === albumQueue.length - 1}
                        onClick={() =>
                          setAlbumQueue((current) =>
                            moveStudioQueuedSong(
                              current,
                              queued.id,
                              1,
                            ),
                          )
                        }
                      >
                        ↓
                      </button>
                      <button
                        onClick={() =>
                          setAlbumQueue((current) =>
                            removeStudioQueuedSong(
                              current,
                              queued.id,
                            ),
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="queue-empty">
                Add several songs now. Their order is visible, but their
                plans remain unborn until continuity reaches them.
              </div>
            )}

            {albumQueue.length > 0 ? (
              <button
                className="prepare-queued-button"
                disabled={
                  preparingNext ||
                  !lastCommit?.inheritedDeck
                }
                onClick={prepareQueuedSong}
              >
                {preparingNext
                  ? "Preparing next crossing…"
                  : lastCommit?.inheritedDeck
                    ? `Prepare next: ${albumQueue[0].name}`
                    : "Render + seal current song to unlock next"}
              </button>
            ) : null}
          </div>

          <div className="receipt-box">
            <span className="panel-kicker">RECEIPT</span>
            {session.receipt ? (
              <>
                <strong>{session.receipt.phase}</strong>
                <div>
                  {session.receipt.events.length} events ·{" "}
                  {session.receipt.carry.newCards.length} new cards
                </div>
                <div>
                  held:{" "}
                  {session.receipt.carry.held.join(", ") || "none"}
                </div>
              </>
            ) : (
              <div>No receipt in this bundle.</div>
            )}
          </div>

          {error ? <div className="error">{error}</div> : null}

          {dirty ? (
            <div className="local-law">
              These edits are still local proposals. "Render + seal"
              rematerializes bounded awakenings, renders the complete
              performance, hashes the evidence, and creates a new receipt.
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
};
