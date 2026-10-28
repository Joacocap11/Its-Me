import type { Region } from "../api/types";

export type BodyView = "front" | "back";

export interface Shape {
  region: Region | null;
  d: string;
  mirror: boolean;
}

export const BODY_VIEWBOX = "0 0 200 440";
export const BODY_WIDTH = 200;

const head: Shape = { region: "head", d: "M82 32a18 23 0 1 0 36 0a18 23 0 1 0-36 0Z", mirror: false };
const neck: Shape = { region: "neck", d: "M91 54H109L111 76H89Z", mirror: false };
const shoulders: Shape = {
  region: "shoulders",
  d: "M100 76H89C76 78 62 80 54 90C48 96 46 104 46 112H66C66 106 72 100 80 98L89 94L100 96Z",
  mirror: true,
};
const torsoUpper = (region: Region | null): Shape => ({
  region,
  d: "M80 98L89 94L100 96L111 94L120 98C124 110 126 130 126 150H74C74 130 76 110 80 98Z",
  mirror: false,
});
const waist: Shape = {
  region: "waist",
  d: "M74 150H126C122 162 121 178 123 192H77C79 178 78 162 74 150Z",
  mirror: false,
};
const hips: Shape = {
  region: "hips",
  d: "M77 192H123C128 206 130 222 128 238H72C70 222 72 206 77 192Z",
  mirror: false,
};
const arms: Shape = {
  region: "arms",
  d: "M46 112H66C66 140 64 165 62 190C60 212 58 228 54 242H40C41 228 42 208 43 190C44 165 46 140 46 112Z",
  mirror: true,
};
const hands: Shape = {
  region: "hands",
  d: "M40 242H54C56 256 58 270 56 282C54 292 50 296 46 296C40 296 36 288 36 278C36 266 38 254 40 242Z",
  mirror: true,
};
const legs: Shape = {
  region: "legs",
  d: "M72 238H99C99 270 98 300 95 322C96 345 94 370 92 396H78C74 360 72 340 76 322C74 300 70 270 72 238Z",
  mirror: true,
};
const feetFront: Shape = {
  region: "feet",
  d: "M78 396H92C92 408 93 416 95 422C96 428 94 432 88 432H76C70 432 70 424 74 418C77 414 78 406 78 396Z",
  mirror: true,
};
const feetBack: Shape = {
  region: "feet",
  d: "M78 396H92V420C92 430 88 434 84 434C78 434 76 430 76 420Z",
  mirror: true,
};
const eyes: Shape = { region: "eyes", d: "M83.5 31a6.5 4.5 0 1 0 13 0a6.5 4.5 0 1 0-13 0Z", mirror: true };

export const BODY_SHAPES: Record<BodyView, Shape[]> = {
  front: [head, neck, shoulders, torsoUpper("chest"), waist, hips, arms, hands, legs, feetFront, eyes],
  back: [head, neck, shoulders, torsoUpper(null), waist, hips, arms, hands, legs, feetBack],
};

export const REGION_DOTS: Partial<Record<Region, { at: [number, number]; mirror: boolean }>> = {
  head: { at: [100, 14], mirror: false },
  eyes: { at: [100, 31], mirror: false },
  neck: { at: [100, 66], mirror: false },
  shoulders: { at: [58, 98], mirror: true },
  chest: { at: [100, 124], mirror: false },
  arms: { at: [54, 160], mirror: true },
  hands: { at: [46, 272], mirror: true },
  waist: { at: [100, 172], mirror: false },
  hips: { at: [100, 216], mirror: false },
  legs: { at: [86, 290], mirror: true },
  feet: { at: [84, 420], mirror: true },
};

export const regionsInView = (view: BodyView): Set<Region> =>
  new Set(BODY_SHAPES[view].flatMap((s) => (s.region ? [s.region] : [])));
