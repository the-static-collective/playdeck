import {
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import {join, relative} from "node:path";
import {fileURLToPath} from "node:url";
import {parseBundleStrings} from "./bundle";
import {recomposeStudioPlan} from "./recompose";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const bundleRoot = join(repoRoot, "out", "command-001");

if (!statSync(bundleRoot).isDirectory()) {
  throw new Error(
    "Studio proof requires out/command-001 from command:proof.",
  );
}

const walk = (root: string): string[] =>
  readdirSync(root, {withFileTypes: true}).flatMap((entry) => {
    const absolute = join(root, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });

const entries: Record<string, string> = {};

for (const file of walk(bundleRoot)) {
  if (/\.(json|txt|md)$/i.test(file)) {
    entries[relative(bundleRoot, file).replaceAll("\\", "/")] =
      readFileSync(file, "utf8");
  }
}

const session = parseBundleStrings(entries, "command-001");

if (session.deck.cards.length !== 4) {
  throw new Error(
    `Studio expected 4 cards, got ${session.deck.cards.length}`,
  );
}

if (session.receipt?.phase !== "rendered") {
  throw new Error(
    "Studio must prefer the rendered receipt from a witnessed bundle.",
  );
}

if (!session.assetBindings[session.track.source]) {
  throw new Error(
    "Studio failed to reconstruct the bundle audio binding.",
  );
}

const recomposed = recomposeStudioPlan({
  deck: session.deck,
  track: {
    ...session.track,
    gates: session.plan.gates,
  },
  worldRule: {
    ...session.worldRule,
    surface: "studio-proof-surface",
  },
  priorPlan: session.plan,
});

if (
  recomposed.worldRuleId !== session.worldRule.id ||
  recomposed.events.length === 0
) {
  throw new Error(
    "Studio local recomposition failed.",
  );
}

console.log(
  JSON.stringify({
    bundle: session.bundleName,
    cards: session.deck.cards.length,
    receiptPhase: session.receipt.phase,
    assetBindings: Object.keys(session.assetBindings).length,
    originalEvents: session.plan.events.length,
    recomposedEvents: recomposed.events.length,
  }),
);
