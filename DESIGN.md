---
version: 1.0.0
name: MailCheap Light Mode Design System
description: Official design system for Outpost V1, adapted from MailCheap. Minimalist, editorial command room with premium serif headlines, calm neutral surfaces, hairline borders, and dark high-contrast CTA pills.
colors:
  primary: "#171717"
  secondary: "#737373"
  tertiary: "#e5e5e5"
  neutral: "#ffffff"
  surface: "#fafafa"
  on-surface: "#0a0a0a"
  text: "#0a0a0a"
  accent: "#2b1a1e"
  border: "#e5e5e5"
  muted: "#f5f5f5"
  error: "#dc2626"
typography:
  headline-display:
    fontFamily: Newsreader, serif
    fontSize: 64px
    fontWeight: 520
    lineHeight: 67.2px
    letterSpacing: -2.24px
  headline-lg:
    fontFamily: Newsreader, serif
    fontSize: 47px
    fontWeight: 420
    lineHeight: 49.92px
    letterSpacing: -0.96px
  headline-md:
    fontFamily: Geist, sans-serif
    fontSize: 34px
    fontWeight: 420
    lineHeight: 41px
    letterSpacing: -0.45px
  headline-sm:
    fontFamily: Geist, sans-serif
    fontSize: 25px
    fontWeight: 420
    lineHeight: 30px
  body-lg:
    fontFamily: Geist, sans-serif
    fontSize: 18px
    fontWeight: 400
    lineHeight: 32px
  body-md:
    fontFamily: Geist, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 28px
  body-sm:
    fontFamily: Geist, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 24px
  label-lg:
    fontFamily: Geist, sans-serif
    fontSize: 15px
    fontWeight: 500
    lineHeight: 22px
  label-md:
    fontFamily: Geist, sans-serif
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
  label-sm:
    fontFamily: Geist, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  xs: 6px
  sm: 14px
  md: 24px
  lg: 36px
  xl: 112px
components:
  button-primary:
    backgroundColor: "#171717"
    textColor: "#ffffff"
    typography: "label-lg"
    rounded: "9999px"
    padding: "15px 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#0a0a0a"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "#737373"
    borderColor: "#e5e5e5"
    typography: "label-lg"
    rounded: "9999px"
    padding: "15px 20px"
    height: "44px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "#0a0a0a"
    typography: "label-lg"
    rounded: "0px"
    padding: "0px"
  card:
    backgroundColor: "#ffffff"
    textColor: "#0a0a0a"
    borderColor: "#e5e5e5"
    rounded: "14px"
    padding: "16px"
  input:
    backgroundColor: "#ffffff"
    textColor: "#0a0a0a"
    borderColor: "#e5e5e5"
    typography: "body-sm"
    rounded: "10px"
    padding: "12px"
  chip:
    backgroundColor: "#fafafa"
    textColor: "#737373"
    borderColor: "#e5e5e5"
    typography: "label-sm"
    rounded: "9999px"
    padding: "8px 12px"
---

# DESIGN.md — Official Outpost V1 Light-Mode System (MailCheap)

## 1. Overview & Vibe
Outpost V1 is an all-day operations command room built strictly in **light mode**. The design is inspired by MailCheap: editorial, crisp, and restrained. It combines high-contrast typography, warm serif accents, white card surfaces, hairline borders (`#e5e5e5`), and black pill CTA buttons (`#171717`).

Zero generic AI dark mode. Zero heavy drop-shadows. Zero cartoon gradients.

## 2. Core Color Tokens
- **Canvas / Background (`#fafafa`):** Main app page backdrop.
- **Card / Surface (`#ffffff`):** Clean white cards and modal surfaces.
- **Surface Subtle (`#f5f5f5`):** Secondary container fills and inactive badge chips.
- **Border (`#e5e5e5`):** 1px hairline outlines for cards, dividers, and inputs.
- **Primary Ink (`#0a0a0a`):** Primary text and high-contrast headlines.
- **Secondary Text (`#737373`):** Subtitles, meta-labels, timestamps, and muted text.
- **Action CTA (`#171717`):** Solid black pill buttons with white text.
- **Accent Muted (`#2b1a1e`):** Editorial highlight used sparingly.
- **Urgent / Stockout (`#dc2626`):** Red alert badges, damaged stock warnings, and stockout notifications.

## 3. Typography
- **Headlines / Key Numbers:** `Newsreader` (serif) or `Geist` for editorial hero moments.
- **UI Labels & Data:** `Geist Sans` / system-ui for high legibility at 12–16px.
- **Timestamps & Carton Counts:** `Geist Mono` or monospace for aligned tabular numbers.

## 4. Components & Elevation
- **Pill Buttons:** `rounded-full` (`rounded: 9999px`), 44px height, high-contrast black fill or clean white with 1px border.
- **Cards:** White background, `rounded-2xl` (14–16px), 1px border (`#e5e5e5`), flat or subtle `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`.
- **Status Chips:** `rounded-full`, 6px 12px padding, clear plain-English text.
- **Drawer / Modals:** Slide-in from right or center overlay with white card surface and clean hairline outline.
