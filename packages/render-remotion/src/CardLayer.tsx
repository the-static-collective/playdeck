import React from "react";
import {Img} from "remotion";
import type {CardSpec} from "@playdeck/core";
import type {CardLayout} from "./layout";

export const CardLayer: React.FC<{
  card: CardSpec;
  source: string;
  layout: CardLayout;
}> = ({card, source, layout}) => {
  const crop = card.front?.crop;

  const imageStyle: React.CSSProperties = crop
    ? {
        position: "absolute",
        width: `${100 / crop.width}%`,
        height: `${100 / crop.height}%`,
        left: `${(-crop.x / crop.width) * 100}%`,
        top: `${(-crop.y / crop.height) * 100}%`,
        objectFit: "fill",
      }
    : {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      };

  return (
    <div
      style={{
        position: "absolute",
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        overflow: "hidden",
        opacity: layout.opacity,
        scale: `${layout.scale * layout.scaleX} ${layout.scale}`,
        rotate: `${layout.rotate}deg`,
        transformOrigin: "50% 50%",
        border: `3px solid rgba(230,185,95,${layout.borderAlpha})`,
        boxShadow: "0 10px 30px rgba(0,0,0,.45)",
        filter: layout.filter,
        zIndex: layout.zIndex,
      }}
    >
      <Img src={source} style={imageStyle} />
    </div>
  );
};
