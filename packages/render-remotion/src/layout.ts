import type {CardSpec, CompositionPlan, DeckSpec} from "@playdeck/core";
import type {ActiveEvent} from "./runtime";
import {eventTargetsCard} from "./runtime";

export type CardLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  scale: number;
  rotate: number;
  scaleX: number;
  zIndex: number;
  filter: string;
  borderAlpha: number;
};

type AudioPressure = {
  low: number;
  mid: number;
  high: number;
};

const mix = (a: number, b: number, amount: number) =>
  a + (b - a) * Math.max(0, Math.min(1, amount));

const easeInOut = (p: number) => 0.5 - Math.cos(Math.PI * p) / 2;

const getGrid = (deck: DeckSpec) => {
  const count = Math.max(1, deck.cards.length);
  const sheet = deck.sourceSheets?.[0];
  const columns = sheet?.columns ?? Math.ceil(Math.sqrt(count));
  const rows = sheet?.rows ?? Math.ceil(count / columns);
  return {columns, rows};
};

export const computeCardLayout = ({
  card,
  cardIndex,
  deck,
  plan,
  activeEvents,
  time,
  audio,
}: {
  card: CardSpec;
  cardIndex: number;
  deck: DeckSpec;
  plan: CompositionPlan;
  activeEvents: ActiveEvent[];
  time: number;
  audio: AudioPressure;
}): CardLayout => {
  const {columns, rows} = getGrid(deck);
  const column = cardIndex % columns;
  const row = Math.floor(cardIndex / columns);

  const looseWidth = plan.width / (columns + 1);
  const looseHeight = plan.height / rows;
  const looseX = (column + 0.5) * looseWidth;
  const looseY = row * looseHeight;

  let width = looseWidth;
  let height = looseHeight;
  let x = looseX;
  let y = looseY;
  let opacity = 1;
  let scale = 0.82 + 0.05 * audio.low;
  let rotate = 2 * Math.sin(time * 0.31 + cardIndex * 0.63);
  let scaleX = 1;
  let zIndex = cardIndex;
  let borderAlpha = 0.22;

  const wobbleX =
    22 * Math.sin(time * 0.37 + cardIndex * 1.13) * (0.2 + audio.mid);
  const wobbleY =
    15 * Math.cos(time * 0.29 + cardIndex * 0.71) * (0.15 + audio.high);
  x += wobbleX;
  y += wobbleY;

  const residue = activeEvents.find((event) => event.type === "residue");
  if (residue && !eventTargetsCard(residue, card.id)) {
    opacity *= mix(1, 0.1, easeInOut(residue.progress));
  }

  for (const event of activeEvents) {
    if (!eventTargetsCard(event, card.id)) {
      continue;
    }

    const p = easeInOut(event.progress);

    switch (event.type) {
      case "arrive": {
        if (event.params?.from === "sheet") {
          const sheetWidth = plan.width / columns;
          const sheetHeight = plan.height / rows;
          x = mix(column * sheetWidth, x, p);
          y = mix(row * sheetHeight, y, p);
          width = mix(sheetWidth, width, p);
          height = mix(sheetHeight, height, p);
          scale = mix(1, scale, p);
          rotate = mix(0, rotate, p);
          borderAlpha = mix(0.04, borderAlpha, p);
          opacity = 1;
        } else {
          opacity *= mix(0.15, 1, p);
          scale *= mix(0.72, 1, p);
        }
        break;
      }

      case "drift":
        x += Math.sin(time * 0.9 + cardIndex) * 30 * (0.3 + audio.mid);
        y += Math.cos(time * 0.7 + cardIndex * 0.4) * 22 * (0.2 + audio.high);
        break;

      case "hinge":
      case "flip": {
        const hinge = Math.abs(Math.cos(Math.PI * event.progress));
        scaleX *= mix(0.42, 1, hinge);
        rotate +=
          Math.sin(Math.PI * event.progress) *
          (cardIndex % 2 === 0 ? -7 : 7);
        zIndex += 20;
        break;
      }

      case "fracture":
        x += (cardIndex % 2 === 0 ? -1 : 1) * audio.high * 24;
        rotate +=
          (cardIndex - deck.cards.length / 2) * 0.55 * audio.high;
        scaleX *=
          0.92 + 0.08 * Math.abs(Math.sin(time * 14 + cardIndex));
        break;

      case "contact-sheet": {
        const targetWidth = (plan.width * 0.62) / columns;
        const targetHeight = (plan.height * 0.62) / rows;
        const originX = plan.width * 0.19;
        const originY = plan.height * 0.19;
        width = mix(width, targetWidth, p);
        height = mix(height, targetHeight, p);
        x = mix(x, originX + column * targetWidth, p);
        y = mix(y, originY + row * targetHeight, p);
        rotate = mix(rotate, 0, p);
        scale = mix(scale, 0.96, p);
        break;
      }

      case "assemble": {
        const cohesion =
          typeof event.params?.cohesion === "number"
            ? Number(event.params.cohesion)
            : 1;
        const amount = p * cohesion;
        const targetWidth = plan.width / columns;
        const targetHeight = plan.height / rows;
        width = mix(width, targetWidth, amount);
        height = mix(height, targetHeight, amount);
        x = mix(x, column * targetWidth, amount);
        y = mix(y, row * targetHeight, amount);
        rotate = mix(rotate, 0, amount);
        scale = mix(scale, 1, amount);
        scaleX = mix(scaleX, 1, amount);
        borderAlpha = mix(borderAlpha, 0.06, amount);
        break;
      }

      case "stack":
        x = mix(x, plan.width / 2 - width / 2 + (cardIndex - 4) * 7, p);
        y = mix(y, plan.height / 2 - height / 2 + (cardIndex - 4) * 5, p);
        rotate = mix(rotate, (cardIndex - 4) * 2.5, p);
        zIndex += 50 + cardIndex;
        break;

      case "corrupt":
        scaleX *=
          0.88 + 0.12 * Math.abs(Math.sin(time * 18 + cardIndex));
        x += Math.sin(time * 31 + cardIndex * 4) * 6 * audio.high;
        borderAlpha = 0.6;
        break;

      case "hold":
        scale *= mix(1, 1.12, p);
        zIndex += 100;
        borderAlpha = mix(borderAlpha, 0.9, p);
        break;

      case "portal":
      case "awaken":
        scale *= mix(1, 1.22, p);
        zIndex += 80;
        break;

      case "freeze":
        rotate = mix(rotate, 0, p);
        break;

      case "thread":
      case "residue":
      case "custom":
        break;
    }
  }

  const corrupt = activeEvents.some((event) => event.type === "corrupt");
  const filter = corrupt
    ? `contrast(${1.08 + audio.high * 0.18}) saturate(${0.8 + audio.mid * 0.25}) hue-rotate(${Math.sin(time * 9) * 4}deg)`
    : `contrast(${1 + audio.high * 0.04}) saturate(${1 + audio.mid * 0.05})`;

  return {
    x,
    y,
    width,
    height,
    opacity,
    scale,
    rotate,
    scaleX,
    zIndex,
    filter,
    borderAlpha,
  };
};
