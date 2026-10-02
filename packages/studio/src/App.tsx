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
  buildStudioCommitPayload,
  commitStudioPerformance,
} from "./cockpitClient";
import type {StudioCommitResult} from "./cockpitTypes";
import {recomposeStudioPlan} from "./recompose";
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

  useEffect(
    () => () => loaded?.dispose(),
    [loaded],
  );

  const assets = loaded?.assetUrls ?? {};

  const selected = useMemo(
    () =>
      session?.deck.cards.find(
        (card) => card.id === selectedCard,
      ),
    [session, selectedCard],
  );

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
      setLastCommit(null);
      setDirty(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : String(reason),
      );
    }
  };

  const commitPerformance = async () => {
    if (!loaded || !session || committing) return;

    try {
      setError(null);
      setCommitting(true);
      const payload = await buildStudioCommitPayload({
        loaded,
        session,
        inherit: inheritAfterRender,
      });
      const result = await commitStudioPerformance(payload);
      setLastCommit(result);
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
          <div className="eyebrow">PLAYDECK / STUDIO 001</div>
          <h1>Open the room.</h1>
          <p>
            Load any PlayDeck output bundle. Studio reconstructs its
            logical media, receipt, composition plan, and deck without
            inventing a second file format.
          </p>
          <label className="bundle-button">
            Choose PlayDeck bundle
            <input
              type="file"
              multiple
              {...({webkitdirectory: ""} as Record<string, string>)}
              onChange={onBundle}
            />
          </label>
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
          <div className="eyebrow">PLAYDECK / STUDIO 001</div>
          <h1>{session.deck.title ?? session.deck.id}</h1>
        </div>
        <div className="top-actions">
          <span className={dirty ? "badge dirty" : "badge"}>
            {dirty ? "LOCAL RECOMPOSITION" : "WITNESSED BUNDLE"}
          </span>
          <label className="compact-button">
            Open another
            <input
              type="file"
              multiple
              {...({webkitdirectory: ""} as Record<string, string>)}
              onChange={onBundle}
            />
          </label>
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
