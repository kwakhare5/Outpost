# DESIGN.md — Visual System & UI Vibe
#
# PURPOSE: Defines the design tokens, fonts, components, and aesthetic standards.
# The AI reads this before building or styling any frontend UI to eliminate slop.
#
# REFERENCE SKILLS:
# For deep UI polish and decisions, refer to global skills:
# - taste-skill (anti-slop art direction)
# - emil-design-eng (component polish & micro-interactions)
# - shadcn (component patterns)
# - impeccable (visual audits & contrast)

---

## 1. Aesthetic Direction & Vibe
- **Design Theme:** <e.g. Minimalist developer tool / editorial / modern SaaS / high-density dashboard>
- **Background Feel:** <e.g. Deep dark mode, subtle grid texture, clean flat light mode>
- **Density:** <e.g. Compact (for data apps) or Spacious (for marketing/landing)>

---

## 2. Color Palette (Tokens)
_Hardcoded hex values. The AI must use these exact classes/tokens._

| Token | Hex / Class | Purpose |
|---|---|---|
| Background | `#0B0F17` | Main page background |
| Surface / Card | `#151C28` | Cards, panels, modals |
| Surface Hover | `#1E2838` | Hover state for interactive cards |
| Border | `#283548` | Subtle boundaries and separators |
| Text Primary | `#F8FAFC` | Headings and primary body copy |
| Text Muted | `#94A3B8` | Subtitles, labels, placeholders |
| Accent / Brand | `#3B82F6` | Primary action buttons and focus rings |
| Accent Hover | `#2563EB` | Active button hover state |
| Destructive | `#EF4444` | Errors, warnings, delete buttons |

---

## 3. Typography & Hierarchy
- **Heading Font:** <e.g. Inter / Geist Sans / Plus Jakarta Sans>
- **Body Font:** <e.g. Inter / system-ui>
- **Monospace Font:** <e.g. JetBrains Mono / Geist Mono>
- **Scale:**
  - `H1`: 32px / font-bold / tracking-tight
  - `H2`: 24px / font-semibold / tracking-tight
  - `H3`: 18px / font-medium
  - `Body`: 14px / font-normal / leading-relaxed
  - `Caption`: 12px / font-medium / text-muted

---

## 4. Component Rules
- **Buttons:**
  - Always have clear hover, active, and focus-visible states.
  - Border radius: `rounded-lg` (8px).
  - Primary button: Solid accent background with white text.
  - Secondary button: Subtle border with transparent or surface background.
- **Inputs & Forms:**
  - Clear 1px border with high contrast against the card background.
  - Visible focus ring matching accent token.
  - Meaningful inline error messages below the input, never alert popups.
- **Icons:**
  - Use `lucide-react` icons exclusively.
  - Standard icon size: 16px (`w-4 h-4`) or 20px (`w-5 h-5`).
  - Icons paired with text must align cleanly with flexbox.

---

## 5. Anti-Slop Checklist (Never Do)
- [ ] No generic purple-on-black AI landing page gradients.
- [ ] No fake decorative stats without real meaning.
- [ ] No low-contrast gray text on dark gray backgrounds (fail WCAG).
- [ ] No unstyled raw browser alerts or confirm dialogs.
- [ ] No missing loading skeletons or spinners on async actions.
