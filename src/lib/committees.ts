/**
 * Committee color system (spec §6, added 2026-08-25). Sourced from the 9
 * gradient swatches in `Lading/Paleta de colores/*.png`. Values below are
 * sampled by eye from the mid/saturated band of each gradient PNG (no
 * pixel-level color-picker tool was available in this environment) —
 * treat as accurate to the intended hue family; a designer with the
 * original files open in an image editor should eyedropper-verify before
 * this ships to production if pixel-exact brand color matters.
 *
 * Usage is intentionally narrow (see MASTER.md "Committee palette"): ONLY
 * the About-page team grouping and the event category badge. Never use
 * these as general-purpose accent colors elsewhere — that would dilute
 * the core pink→blue brand identity the rest of the site is built on.
 *
 * Each entry carries three derived values, not just the raw swatch hue:
 *  - `solid`   the true sampled brand color (dots, icons, gradient banners)
 *  - `tint`    a ~10-15% wash of `solid` over white, for badge backgrounds
 *  - `text`    a darkened, contrast-checked version of `solid` for text ON
 *              `tint` (several source hues — Sports cyan, Trips yellow,
 *              Merch orange — are too light to pass 4.5:1 as raw text)
 */

export type CommitteeKey =
  | "Events"
  | "Finance"
  | "Legal"
  | "Merch"
  | "S&C"
  | "Social Media"
  | "Sports"
  | "Tandem"
  | "Trips";

export const COMMITTEE_KEYS: CommitteeKey[] = [
  "Events",
  "Finance",
  "Legal",
  "Merch",
  "S&C",
  "Social Media",
  "Sports",
  "Tandem",
  "Trips",
];

interface CommitteeColor {
  label: string;
  solid: string;
  tint: string;
  text: string;
  gradient: string;
}

export const COMMITTEES: Record<CommitteeKey, CommitteeColor> = {
  Events: {
    label: "Events",
    solid: "#FF2E97",
    tint: "#FDE3F1",
    text: "#C71C74",
    gradient: "linear-gradient(135deg, #FF7AC0, #FF2E97)",
  },
  Finance: {
    label: "Finance",
    solid: "#2F7DFF",
    tint: "#E3EEFF",
    text: "#1B54C4",
    gradient: "linear-gradient(135deg, #8FBBFF, #2F7DFF)",
  },
  Legal: {
    label: "Legal",
    solid: "#8A8A93",
    tint: "#EDEDF0",
    text: "#56565F",
    gradient: "linear-gradient(135deg, #C7C7CE, #8A8A93)",
  },
  Merch: {
    label: "Merch",
    solid: "#FF9518",
    tint: "#FFEBD1",
    text: "#B15E00",
    gradient: "linear-gradient(135deg, #FFC26B, #FF9518)",
  },
  "S&C": {
    label: "Social & Cultural",
    solid: "#8F6FF2",
    tint: "#EDE7FE",
    text: "#6A47D6",
    gradient: "linear-gradient(135deg, #C3B4FB, #8F6FF2)",
  },
  "Social Media": {
    label: "Social Media",
    solid: "#EE33E0",
    tint: "#FCE0FA",
    text: "#B81CAE",
    gradient: "linear-gradient(135deg, #FA8FF2, #EE33E0)",
  },
  Sports: {
    label: "Sports",
    solid: "#5FD3F5",
    tint: "#DFF6FD",
    text: "#147EA3",
    gradient: "linear-gradient(135deg, #B7ECFB, #5FD3F5)",
  },
  Tandem: {
    label: "Tandem",
    solid: "#45C15A",
    tint: "#E1F6E5",
    text: "#2E8C41",
    gradient: "linear-gradient(135deg, #A0E0AC, #45C15A)",
  },
  Trips: {
    label: "Trips",
    solid: "#FFC61E",
    tint: "#FFF3D1",
    text: "#9C6A00",
    gradient: "linear-gradient(135deg, #FFE28A, #FFC61E)",
  },
};
