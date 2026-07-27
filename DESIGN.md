---
name: Checkmate
description: Soft collaborative checklist app — pastel list accents, dark/light themes
colors:
  ink: "#0a0a0a"
  ink-soft: "#111111"
  black: "#000000"
  paper: "#fafafa"
  surface: "#ffffff"
  white: "#ffffff"
  surface-muted: "#f8f8f8"
  surface-input: "#f7f7f7"
  surface-input-alt: "#f5f5f5"
  border: "#e8e8e8"
  border-soft: "#e0e0e0"
  border-mid: "#d0d0d0"
  border-strong: "#ddd"
  border-stronger: "#ccc"
  muted: "#888888"
  muted-soft: "#aaaaaa"
  muted-faint: "#bbb"
  gray-666: "#666"
  gray-555: "#555"
  gray-555-full: "#555555"
  gray-444: "#444"
  gray-333: "#333"
  dark-bg: "#111111"
  dark-surface: "#1e1e1e"
  dark-surface-raised: "#252525"
  dark-surface-hover: "#2a2a2a"
  dark-border: "#2c2c2c"
  dark-elevated: "#3a3a3a"
  dark-elevated-2: "#363636"
  dark-elevated-3: "#383838"
  dark-text: "#efefef"
  dark-blue-tint: "#2a3a4a"
  dark-success-bg: "#162218"
  dark-success-deep: "#1e4d2a"
  dark-danger-bg: "#2a1a1a"
  dark-danger-deep: "#3a1010"
  priority-high: "#e05555"
  priority-med: "#c47a0a"
  priority-low: "#2f8a55"
  priority-high-bg: "#FFECEC"
  priority-med-bg: "#FFF6E0"
  priority-low-bg: "#E4F7EC"
  overdue: "#d44"
  overdue-soft: "#f08080"
  overdue-bright: "#ff8080"
  success-bright: "#3a8f56"
  success-mid: "#5a9e6f"
  success-tint: "#c8eed3"
  success-wash: "#eef8f1"
  info-wash: "#dde8f7"
  pastel-pink: "#FFD6E0"
  pastel-blue: "#D6E8FF"
  pastel-green: "#D6FFE4"
  pastel-yellow: "#FFF3D6"
  pastel-purple: "#E8D6FF"
  pastel-orange: "#FFE4D6"
  danger: "#c0392b"
  danger-rgb: "rgb(200, 50, 50)"
  success: "#2f8a55"
  scrim: "rgba(0,0,0,0.45)"
  scrim-strong: "rgba(0,0,0,0.4)"
  scrim-soft: "rgba(0,0,0,0.38)"
  scrim-mid: "rgba(0,0,0,0.35)"
  shadow-07: "rgba(0,0,0,0.07)"
  shadow-09: "rgba(0,0,0,0.09)"
  shadow-10: "rgba(0,0,0,0.1)"
  shadow-12: "rgba(0,0,0,0.12)"
  shadow-14: "rgba(0,0,0,0.14)"
  shadow-18: "rgba(0,0,0,0.18)"
  shadow-20: "rgba(0,0,0,0.2)"
  danger-a06: "rgba(200,50,50,0.06)"
  danger-a10: "rgba(200,50,50,0.1)"
  danger-a12: "rgba(200,50,50,0.12)"
  danger-a15: "rgba(200,50,50,0.15)"
  danger-a18: "rgba(200,50,50,0.18)"
  danger-a25: "rgba(200,50,50,0.25)"
  danger-a30: "rgba(200,50,50,0.3)"
typography:
  display:
    fontFamily: "Lora, Georgia, serif"
    fontWeight: 600
    fontStyle: italic
    fontSize: "28px"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "14px"
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.08em"
  scale:
    micro-5: "5px"
    micro-8: "8px"
    micro-8-5: "8.5px"
    micro-9: "9px"
    micro-9-5: "9.5px"
    xs: "10px"
    xs-10-5: "10.5px"
    sm: "11px"
    sm-11-5: "11.5px"
    md: "12px"
    md-12-5: "12.5px"
    md-13: "13px"
    md-13-5: "13.5px"
    base: "14px"
    base-15: "15px"
    lg: "16px"
    lg-17: "17px"
    lg-18: "18px"
    lg-19: "19px"
    xl: "20px"
    xl-22: "22px"
    xl-24: "24px"
    xl-26: "26px"
    display-28: "28px"
    display-34: "34px"
    hero-40: "40px"
    hero-60: "60px"
rounded:
  xxs: "3px"
  xs: "4px"
  xs-5: "5px"
  xs-6: "6px"
  sm: "8px"
  md: "9px"
  md-10: "10px"
  lg: "12px"
  xl: "20px"
  pill: "99px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md-10}"
    padding: "11px 14px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
    rounded: "{rounded.md-10}"
---

## Overview

Checkmate is an Operate-mode product UI: warm neutrals, soft pastel list accents, Lora italic for brand/display headings, DM Sans for UI chrome. Light and dark themes share the same structure. Polish should refine spacing, focus states, anti-patterns (side-tab borders, layout-width transitions, bounce easing), and consistency — not replace the visual world.

## Colors

- Neutrals: near-black ink on paper/off-white; dark mode inverts to soft white on charcoal surfaces.
- Extended chrome grays (`#333`–`#bbb`, `#ddd`/`#ccc`) and dark raised surfaces are part of the Operate shell.
- Pastels identify lists; never use purple-gradient marketing tropes.
- Priority / overdue / success semantic colors stay consistent across desktop and mobile.
- Scrims and soft shadows use documented black/danger alpha tokens.

## Typography

- Display: Lora italic for brand name, panel titles, list names.
- Body/UI: DM Sans; enumerated `typography.scale` covers Operate fluid clamp endpoints.
- Section labels are 10px uppercase tracked.

## Layout

- Desktop: sidebar lists + main task panel.
- Mobile: bottom/tab navigation, full-bleed panels.
- Spacing prefers 4/8 rhythm; generous separation between groups.

## Elevation & Depth

- Soft shadows via documented `shadow-*` tokens; prefer border + surface change over heavy multi-layer shadows.
- Modals: `scrim` overlay + rounded surface.

## Shapes

- Controls use the rounded scale (3–12px + pill); avatars circular (`full` / 50%).

## Components

- Primary CTA: solid ink button.
- Inputs: muted fill + 1px border.
- Tabs: underline or segmented control; priority accents use top inset, not thick side borders.
- Prefer `transform`/`opacity` transitions over animating width/height.

## Do's and Don'ts

- Do preserve pastel list colors and Lora + DM Sans pairing.
- Do support dark/light contrast for text and controls.
- Do keep new literals in DESIGN.md when intentionally extending the system.
- Don't introduce Inter, purple gradients, or nested card-in-card clutter.
- Don't break Firebase auth, DnD, or notification behavior while polishing.
- Don't rewrite product copy claims without asking.
