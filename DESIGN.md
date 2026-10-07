# Industrial Maintenance Platform — Style Reference

> Abyssal operations console with bioluminescent data orbs. Adapted from the Auros style reference; palette, type, spacing, radii, and surface rules are unchanged.

**Theme:** dark

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

The Industrial Maintenance Platform is an operations console for plant engineers, technicians, and supervisors. It tracks assets, maintenance plans, work orders, spare-part stock, live sensor telemetry, and alerts. It is used in control rooms and on shop-floor screens, so it must make a critical state readable at a glance and stay calm the rest of the time.

The interface keeps the deep-water atmosphere of the original: a near-black teal canvas, bioluminescent data orbs, and teal-to-pink light gradients that suggest depth and flow. Sensor streams and asset health are the "liquid" that the layout is built around. The typography stays a single custom display face (Matter) at medium weight with aggressive negative tracking. Color is rationed: achromatic whites and silvers carry almost all content, and the chromatic palette is reserved for atmospheric gradients, card surface differentiation, and one signature pill button that morphs from teal-cyan to lavender-pink. Cards float on teal-tinted surface lifts (16px radius, no shadows), so hierarchy reads as depth-of-water rather than shadow-on-paper. Components feel engineered and instrument-like: uppercase tracked labels, thin geometric arrow icons, and large numerical stats in pale pink.

## Colors

| Name                    | Value                                                                                                                            | Role                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Liquid Abyss            | `#012624`                                                                                                                        | Primary canvas — page background, header, login hero, and the dominant dark-teal field. Establishes the deep-water atmosphere behind every screen                    |
| Liquid Deep             | `#011d1c`                                                                                                                        | Recessed surface level — footer, audit-log panel, and deeper table wells. Reads as a half-step darker than the canvas                                                |
| Liquid Kelp             | `#003734`                                                                                                                        | Raised card surface and primary button fill — asset cards, work-order panels, KPI tiles, and the gradient button's origin point                                      |
| Liquid Mist             | `#edfffe`                                                                                                                        | Cool-tinted off-white for emphasized body text, section labels, the live telemetry line, and healthy-state indicators                                                |
| Platinum                | `#ffffff`                                                                                                                        | Pure white for headings, primary navigation, asset tags, and icon strokes                                                                                            |
| Silver Mist             | `#bbc7c6`                                                                                                                        | Secondary body text, table cell text, metadata (timestamps, serial numbers), and link color in resting state                                                         |
| Ash                     | `#f2f2f2`                                                                                                                        | Tertiary text for notification detail and AI diagnostic-note copy                                                                                                    |
| Slate Deep              | `#707777`                                                                                                                        | Subtle surface tint and muted state for decommissioned assets, cancelled work orders, and chart gridlines                                                            |
| Lavender Phosphor       | `#fde9ff`                                                                                                                        | Highlight color for KPI figures (open work orders, critical assets, low-stock parts). The pink end of the signature gradient, used sparingly as luminous punctuation |
| Alarm Critical          | `#ff6b6b`                                                                                                                        | CRITICAL status tags and the telemetry CRITICAL threshold line only. Added by product decision — see `decisions.md` #4                                               |
| Alarm Warning           | `#ffb020`                                                                                                                        | WARNING status tags (alerts) only. Added by product decision — see `decisions.md` #4                                                                                 |
| Bioluminescent Gradient | `linear-gradient(90deg, rgb(0, 130, 124) 0%, rgb(203, 255, 252) 100%)`                                                           | Signature button and UI gradient — linear sweep from teal-cyan through pale aqua into lavender-pink                                                                  |
| Aurora Gradient         | `linear-gradient(90deg, rgb(203, 255, 252) 0%, rgb(237, 255, 254) 26.25%, rgb(255, 253, 250) 47.57%, rgb(250, 209, 255) 88.96%)` | Supporting palette color for small decorative accents when the core palette needs contrast                                                                           |

## Typography

### Matter — Primary display and body face — used at weight 500 for all headings (H1–H3) and oversized kinetic text (86–295px). Weight 400 for body, table cells, and UI copy. Characterized by aggressive negative tracking on large sizes (-0.04em at 61px, -0.046em at 86px) and wide positive tracking on uppercase labels (0.08em at 20px, 0.12em at 12px, 0.15em at 10px). The medium-weight-only heading strategy gives the console a uniform mechanical confidence.

- **Substitute:** Inter, DM Sans, or Satoshi for close geometric-grotesk match
- **Weights:** 400, 500
- **Sizes:** 10, 12, 13, 14, 16, 20, 24, 36, 61, 86, 96, 295px
- **Line height:** 1.0, 1.3, 1.4, 1.5
- **Letter spacing:** -0.046em at 86px, -0.04em at 61px, -0.02em at 24px, 0.08em uppercase at 20px, 0.12em uppercase at 12px, 0.15em uppercase at 10px

### Arial — Secondary fallback for interactive UI elements (nav, buttons, form inputs, table headers, footer). Only appears at 14px — used as a safe generic fallback where Matter isn't loaded, covering form labels, button text, and small utility copy.

- **Substitute:** system-ui, -apple-system, sans-serif
- **Weights:** 400
- **Sizes:** 14px
- **Line height:** 1.43

### Type Scale

| Role       | Family | Weight | Size | Line Height | Letter Spacing |
| ---------- | ------ | ------ | ---- | ----------- | -------------- |
| caption    | —      | —      | 10px | 1.4         | 1.5px          |
| body       | —      | —      | 16px | 1.4         | 0px            |
| subheading | —      | —      | 24px | 1.3         | -0.48px        |
| heading    | —      | —      | 36px | 1           | 0px            |
| heading-lg | —      | —      | 61px | 1           | -2.44px        |
| display    | —      | —      | 96px | 1           | -3.84px        |

## Spacing & Layout

**Base unit:** 4px

**Density:** spacious

- **Page max-width:** 1440px
- **Section gap:** 68px
- **Card padding:** 36-48px
- **Element gap:** 20px

Dashboard grids keep the 20px element gap between tiles and the 68px section gap between page bands. Data tables use 16px cell padding inside a Surface Card so that long asset and work-order lists stay readable on shop-floor screens.

### Border Radius

- **cards:** 16px
- **small:** 6px
- **buttons:** 6px
- **status tags:** 6px

## Components

### Gradient Pill Button

**Role:** Primary CTA

Filled button with the aurora gradient background (cyan → white → pink). 6px border-radius, 32px vertical padding, 22px horizontal padding. Text in dark color (#222222) at 14px Arial, uppercase. Used for the single most important action on each screen, such as CREATE WORK ORDER on a list, ASSIGN on a work order, or SAVE PLAN on a maintenance form. One per view. The gradient direction is horizontal, creating a sunrise effect.

### Ghost Navigation Link

**Role:** Nav item

Transparent background, no border, uppercase text at 12px Matter weight 400 with 0.12em letter-spacing. White color in active state, silver (#bbc7c6) for inactive. No padding — sits inline with tight 16px column-gap between items. Top-level sections: OVERVIEW, ASSETS, WORK ORDERS, INVENTORY, TELEMETRY, ALERTS, AUDIT.

### Surface Card

**Role:** Content container

Card with #003734 (Liquid Kelp) background, 16px border-radius, 36px padding all sides. No shadow, no border. Headings at 36px Matter 500 white, body at 16px Matter 400 silver. Used for asset summaries, work-order detail panels, and maintenance plan blocks.

### Recessed Card

**Role:** Deep content panel

Card with #011d1c (Liquid Deep) background, 16px border-radius, 120px vertical padding on landing and empty-state surfaces; 36px padding inside dense data views. Creates a sunken well effect for the audit trail, the live telemetry strip, and the empty-state invitation.

### Asset Status Card

**Role:** Asset summary tile

Surface Card on Liquid Kelp with the asset tag in Platinum at 24px Matter 500 (for example PUMP-01), the asset type and location in Silver Mist at 13px, and a status tag in the top-right corner. Below the tag, the last telemetry reading shows temperature, vibration, and pressure as three small figures. The whole card is a link. The arrow icon sits at the right of the tag. Criticality (LOW, MEDIUM, HIGH, CRITICAL) appears as an uppercase 10px label with 0.15em tracking.

### Status Tag

**Role:** Asset and work-order state indicator

6px radius, 4px vertical / 10px horizontal padding, uppercase Matter 400 at 10px with 0.15em tracking. Background is Liquid Abyss with a 1px Slate Deep inset outline. Color carries the state; shape stays the same for every state so the table stays scannable.

| State                                      | Text color        | Marker                           |
| ------------------------------------------ | ----------------- | -------------------------------- |
| OPERATIONAL / OPEN / COMPLETED             | Liquid Mist       | Small 6px dot, Liquid Mist       |
| UNDER_MAINTENANCE / ASSIGNED / IN_PROGRESS | Silver Mist       | Small 6px dot, Silver Mist       |
| BLOCKED / BACKLOG OVERDUE                  | Platinum          | Small 6px dot, Platinum          |
| CRITICAL                                   | Alarm Critical    | Small 6px dot, Alarm Critical    |
| WARNING                                    | Alarm Warning     | Small 6px dot, Alarm Warning     |
| AUTO                                       | Lavender Phosphor | Small 6px dot, Lavender Phosphor |
| DECOMMISSIONED / CANCELLED                 | Silver Mist       | Small 6px dot, Slate Deep        |

> **Correction:** DECOMMISSIONED/CANCELLED originally used Slate Deep for the status text. Slate Deep (`#707777`) on Liquid Abyss measures 3.52:1 and on Liquid Kelp 2.88:1 — both fail WCAG AA (4.5:1) for normal text. The label text now uses Silver Mist (7.58:1 on Kelp, 9.28:1 on Abyss); Slate Deep is kept only for the marker dot.

### Work Order Row

**Role:** List item in the work-order queue

Transparent row on a Liquid Kelp table panel, 16px vertical padding. Columns: work-order number (Silver Mist, 13px), asset tag (Platinum, 16px), description (Silver Mist, truncated to one line), priority (uppercase label), status tag, and the arrow icon button. Rows are separated by a 1px line in Liquid Abyss, not a shadow. AUTO work orders show a small AUTO status tag so operators can tell system-created work from planned work.

### Arrow Icon Button

**Role:** Inline link trigger

32×32 square button, 6px border-radius, semi-transparent dark teal fill (rgba(3, 81, 75, 0.5)). Contains a white diagonal arrow (↗) icon. Always positioned to the right of a card or row title as an "open" trigger.

### Uppercase Section Label

**Role:** Eyebrow / kicker

12px or 20px Matter weight 500, uppercase, letter-spacing 0.08–0.12em, silver (#bbc7c6) or mist (#edfffe) color. Appears above section headings as a categorical label (for example PLANT OVERVIEW, ASSETS, WORK ORDERS, TELEMETRY). Wide tracking reads as technical instrumentation labeling.

### Hero Headline

**Role:** Page-level title

61–96px Matter weight 500, line-height 1.0, letter-spacing -0.04em, white. Used on the login screen and the empty-state invitation (for example "Nothing is overdue"). Fluid sizing via clamp(2.5rem, ..., 3.8rem) for H1 and clamp(2.1rem, ..., 3rem) for H2. Operational screens use the 36px heading size instead, so the page title never competes with live data.

### Oversized Kinetic Text

**Role:** Section-spanning display

86–295px Matter weight 500 at line-height 1.0, letter-spacing -0.046em. Used only on the login screen and the onboarding or empty-state hero, behind the particle sphere. It is never used on screens that show live asset data.

### Statistic Counter

**Role:** Metric display

Large number in lavender-phosphor pink (#fde9ff) with label below in mist (#edfffe) or silver at 13px uppercase tracked. Used for the overview KPIs: OPEN WORK ORDERS, CRITICAL ASSETS, OVERDUE PLANS, LOW-STOCK PARTS, and READINGS LAST HOUR. The pink-on-teal combination is the signature emphasis treatment. A counter should show 0 in the same style as any other count, so an all-clear state does not look like a missing value.

### Telemetry Chart

**Role:** Live sensor trend

Line chart on a Surface Card with Liquid Deep chart well. The series line is 2px Liquid Mist with no fill. The CRITICAL threshold (80°C for the hot-temperature rule) is a 1px dashed line in Alarm Critical with its label in uppercase 10px. Gridlines are 1px Slate Deep at 40% opacity. Axis labels are Silver Mist at 12px Arial. No gradient fill under the line and no shadow. The chart's latest value is shown as a Statistic Counter above the chart.

### Notification Item

**Role:** Alert list entry

Surface Card row with a Status Tag (CRITICAL, WARNING, INFO) at the left, the message in Platinum at 16px, the related asset tag and timestamp in Silver Mist at 13px, and an ACKNOWLEDGE action in the right column. Acknowledged items fall back to Silver Mist text with no status dot. Where an AI diagnostic note is attached, it appears below the message in Ash at 14px inside a Recessed Card, labelled DIAGNOSTIC NOTE in uppercase.

### Data Table

**Role:** Dense list (spare parts, plans, audit trail)

Surface Card wrapper, 16px cell padding, Arial 14px headers in uppercase Silver Mist with 0.08em tracking, Matter 400 16px cell values in Platinum or Silver Mist. Sorting arrows use the thin geometric icon style. Table rows have no hover shadow; hover changes the row background to Liquid Abyss. Numeric columns (quantity, cost, readings) are right-aligned with tabular figures.

### Navigation Bar

**Role:** Site header

Full-width header on Liquid Abyss, transparent background, ~80px height. Wordmark (product name plus mark) left, nav links centered, user role and the primary action on the right. The user's role (ADMIN, SUPERVISOR, TECHNICIAN, VIEWER) appears as a Status Tag so access level is visible. 6px radius on the CTA. Items separated by 16–24px gaps.

### Form Field

**Role:** Input for plans, work orders, and spare parts

Liquid Kelp field background, 6px radius, 1px Slate Deep border, 12px vertical / 14px horizontal padding. Label above the field in uppercase Silver Mist 12px with 0.12em tracking. Input text in Platinum, Arial 14px. Focus state uses a 1px Liquid Mist border and a 2px Liquid Mist outline offset by 2px for keyboard visibility. Error text appears below the field in Lavender Phosphor and states what to change (for example "Interval must be at least 1 day").

### Geometric Molecule Illustration

**Role:** Decorative graphic

Flat geometric pattern of circles and connector shapes in silver/white, used as a right-column balancing element on the login screen and on empty states. No fill complexity — white circles and thin connector lines forming an abstract network diagram. Never placed behind live data.

### Particle Sphere Visual

**Role:** Brand animation

3D particle sphere rendered in teal-cyan and white dots, rotating behind the login hero and inside the overview empty state. The particles pick up the canvas teal and the accent pink at their edges, creating a bioluminescent data-orb effect. This is the defining brand visual on any major screen. On the overview dashboard it appears as a small, non-interactive header graphic, never behind tables or charts. Under reduced motion it is replaced by a still frame of the same sphere.

## Animation

The source reference does not specify timings or easing. The rules below set the boundaries and reuse only the motion that already exists in the original.

- **Login hero:** the Particle Sphere rotates slowly behind the Oversized Kinetic Text. This is the one orchestrated page-load moment.
- **Overview empty state:** the Particle Sphere rotates behind the Hero Headline when no alerts are open. Motion stops once a CRITICAL alert appears, so the eye goes to the alert.
- **Live telemetry:** the Telemetry Chart and latest-value counter update in place with no entrance animation. New points are added without a sweep.
- **Button and link states:** the Gradient Pill Button and Arrow Icon Button change only in color on hover and focus. No lift, no scale.
- **Work-order actions:** when a status changes, the Status Tag swaps color with no transition longer than the existing hover state. The change must be visible without motion.
- **No entrance animations on data.** Tables, cards, and rows appear immediately. Fade-and-slide sequences are not used.
- **Reduced motion:** when the user prefers reduced motion, the Particle Sphere is shown as a still frame and the kinetic text does not move.

## Do's and Don'ts

### Do

- Use only the teal-green surface stack (#011d1c → #012624 → #003734) for background differentiation — never introduce gray, black, or blue surfaces
- Reserve the aurora gradient exclusively for primary CTAs and signature accent moments — never as a background fill or decoration
- Set all headings at Matter weight 500 — no bold, no light, no other weights at display sizes
- Apply uppercase tracking (0.08–0.15em) to all section labels, kickers, status tags, and eyebrow text at 10–20px
- Use lavender-phosphor pink (#fde9ff) only for large statistics and emphasis figures — never for body text or other UI controls
- Keep card radii at 16px and small element radii (buttons, fields, status tags) at 6px — these two values are the complete shape vocabulary
- Use line-height 1.0 for all display text above 36px and line-height 1.4 for all body text — the contrast defines the typographic rhythm
- Make every state readable without color alone: each Status Tag carries its label text as well as its color
- Show the same status tag shape and label text everywhere an asset or work order appears

### Don't

- Do not use drop shadows or box-shadows for elevation — differentiation comes from surface color shifts in the teal stack, not shadow
- Do not introduce bold (600+) or light (300-) weights at display sizes — the medium-only strategy is core to the mechanical confidence
- Do not use white (#ffffff) for body text — reserve pure white for headings and nav, use silver (#bbc7c6) or mist (#edfffe) for body
- Do not use Slate Deep (#707777) for any text — it fails WCAG AA on Liquid Abyss (3.52:1) and Liquid Kelp (2.88:1). Use silver or mist for labels; Slate Deep is limited to gridlines, borders, and marker dots
- Do not apply the aurora gradient to text, borders, chart fills, or backgrounds larger than a single button — it loses luminosity at scale
- Do not use rounded corners above 16px — the system is sharp-rounded, not pill-shaped (buttons and status tags are 6px, cards are 16px)
- Do not place light text on light-pink (#fde9ff) — the pink is a background for dark text, not a text color on dark surfaces
- Alarm Critical (red) and Alarm Warning (amber) are reserved exclusively for CRITICAL and WARNING status indicators — never for decoration, KPI figures, or any other UI element. Do not add green; healthy/operational states stay in the existing palette
- Do not put the Particle Sphere or Oversized Kinetic Text behind tables, charts, or forms
- Do not animate live data for attention; a changing value updates in place

## Elevation

The design deliberately avoids drop shadows. Depth is communicated through a teal-tinted surface stack (abyss → deep → kelp) where each level is a darker or lighter step in the same green hue. This creates the sensation of objects floating at different depths in water rather than being raised off paper. The absence of shadows reinforces the dark, instrument-panel atmosphere and keeps dense operational screens free of visual noise, so hierarchy comes from color and scale.

## Surfaces

- **Liquid Abyss** (`#012624`) — Page canvas — the dominant background field. All content floats on this.
- **Liquid Deep** (`#011d1c`) — Recessed surface — audit trail, telemetry well, footer, and empty-state panels that sink below the canvas.
- **Liquid Kelp** (`#003734`) — Raised card surface — asset cards, work-order panels, KPI tiles, and table wrappers.
- **Slate Deep** (`#707777`) — Low-emphasis tint for decommissioned and cancelled states, gridlines, and borders.

## Imagery

Imagery is minimal and atmospheric. The login screen features the 3D particle sphere described above. Section decorations include flat geometric molecular diagrams on empty states. No photography of equipment, no stock industrial imagery, no people. Equipment is represented by its tag, type, and live readings, not by pictures. This keeps the console honest about the data and keeps the visual language in the same pure data-graphic register as the original.

## Layout

Full-bleed dark canvas with max-width 1440px content. The login screen is a centered text stack (eyebrow → headline → subtext → sign-in action) occupying the full viewport height, with the particle sphere as a background element.

The operational overview uses a top navigation bar and a 12-column grid. The top row holds the Statistic Counters in equal tiles. Below it, the left two-thirds show the Telemetry Chart for the selected asset and the Work Order queue, and the right third shows the Notification list. The asset list and the spare-part inventory use full-width Data Tables.

Sections are full-width bands separated by 68px vertical gaps, alternating between canvas and slightly recessed surfaces. Detail views such as the asset page use a narrow reading column (max ~600px) for descriptions and notes, and the telemetry and history tables stretch to full width. The footer is a recessed well (#011d1c) with 120px vertical padding on the public pages and a compact 36px padding inside the console. Navigation is a thin transparent bar with items spaced at 16–24px gaps. The overall rhythm is calm and spacious, and the deep-water color scheme means an alert stands out against an otherwise quiet screen.

## Accessibility & States

- Every Status Tag shows its text label as well as its color.
- Visible keyboard focus uses the 2px Liquid Mist outline on fields, buttons, rows, and tags.
- Empty states state the situation and the next action, in the interface's voice (for example "No open work orders. Create one from an asset page.").
- Error text states what went wrong and how to fix it, and does not apologize.
- Text on Liquid Abyss and Liquid Kelp uses Silver Mist or brighter for all body copy. Text below Silver Mist is reserved for decorative metadata.

## Open Decisions

The palette was kept exactly as provided, which leaves two places where the console needs something the original brand did not have.

- **Alarm signaling — resolved, see `decisions.md` #4.** Alarm Critical (`#ff6b6b`) and Alarm Warning (`#ffb020`) were added to the palette, used only for CRITICAL and WARNING status indicators.
- **Telemetry color coding — resolved, see `decisions.md` #5.** The chart stays single-asset, single-line. No multi-series palette is needed.

## Similar Brands

- **Wintermute** — Same dark teal-black crypto-native palette with white text, generous spacing, and minimal decoration — both feel like trading-terminal instrument panels rather than marketing sites
- **Jump Crypto** — Dark mode institutional aesthetic with uppercase tracked labels, medium-weight display type, and a single restrained accent color — both prioritize data-readability over visual spectacle
- **Galaxy Digital** — Deep dark canvas with luminous accent moments, spacious section rhythm, and a focus on scale through type rather than imagery
- **Flowdesk** — Dark teal-dominant palette with gradient accent buttons, geometric decorative elements, and medium-weight geometric type — shares the bioluminescent fintech-terminal sensibility
