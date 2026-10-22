# 04 – UX and design

Based on the Home Assistant design guidelines (contributors.home-assistant.io/design). The real build uses the Home Assistant components (`ha-button`, `ha-dialog` or the adaptive dialog, `ha-form` with selectors, `ha-alert`, `ha-empty-state`, `ha-expansion-panel`, `ha-list`), so look, theme, and accessibility are right by default.

## Principles and how they show up

- Privacy and local: everything is calculated locally in Home Assistant; nothing goes to the cloud. (This is no longer a sentence in the wizard.)
- Choice: works with any supplier and any brand; Zonneplan is only an example. You choose each source yourself.
- Sustainability: no custom UI patterns of its own; standard Home Assistant components.
- Welcoming: explanations in plain words, suggestions with a reason ("Suggested because …").
- Assume nothing: the wizard asks how the price is entered, whether something comes on top, the export price, and the solar choice; none of these choices is preselected. Only meters and a price entity are suggested (from the Energy dashboard), and you see them so you can check them.
- Candid: the data check, the "Power only" warning, and **How is this calculated?** on every session.
- Supportive: error messages give the cause _and_ the next step ("Raise ‘Done after’").
- Generous: everything can be changed later; a weak source is allowed, but with an explanation.

## Flows

### 1. Installing (config flow, **Settings** > **Devices & services**)

One confirmation without fields: "Energydash is added to the sidebar. There you choose your electricity price and meters, and add your devices." The meters from the Energy dashboard (all import, export, and production counters) and a suggested price entity are stored as starting values. The type of price stays empty until you choose.

**Reconfigure** only has **Clear data** (**Keep everything**, **Clear calculated data, keep devices**, or **Start fresh: remove devices and data**). There is no options flow anymore: prices and meters are in the panel.

### 2. Panel, first time: quick start (`ed-onboarding`)

Goal: a new user gets their devices in two selections, without knowing what counters, types, or sources are. Anything that isn't needed is left out.

1. Start: a 64 px icon, the heading **See what your devices cost**, one sentence of explanation, the **Start wizard** button, and below it the text button **Advanced setup** (opens the wizard of flow 3; if the price isn't chosen yet, steps 1a to 1c come first). Not an administrator: only the explanation.
   - 1a. **Your electricity price** (step 1 of 2 or 3): **How do you want to enter your electricity price?** \* with **Price from an entity** or **Fixed price**, nothing preselected.
     - Entity: **Price entity** \* (sensors per kWh on top, with the current price below each), then **Is this the price you really pay?** \* with **Yes, everything is included** or **No, something comes on top**, which leads to **Extra per kWh (€)** \*.
     - Fixed: **Do you have one price or a day and night tariff?** \* with **One price**, which leads to **Price per kWh (€)** \*, or **Normal and low**, which leads to **Normal tariff (€/kWh)** \* and **Low tariff (€/kWh)** \*.
   - 1b. **Your meters**: **Import from the grid** \*, **Export to the grid**, and **Solar production**, prefilled from the Energy dashboard. Each meter has **Add counter** for separate normal and low tariff counters, or several inverters.
   - 1c. **Solar power and export** (only with an export or production counter): **What does power from your own solar panels cost?** \*. Only with **What you would otherwise have received** does **Where does that export price come from?** \* follow (**From your price entity**, **From another entity**, or **A fixed amount**); with a fixed price, it's only an amount.
   - The quick start always starts without chosen answers; follow-up questions appear only after a choice. In **Settings**, the current answers are selected.
   - Each choice is a card with a title, one short line, and an example line that shows what happens to the price. It's a calculation with real values once they are known ("€0.295 + €0.165 = €0.460", "Solar = export price = €0.08", "Solar = grid price = €0.30"), otherwise it starts with "E.g.". The two types of price always show an explanatory example ("E.g. 14:00 €0.24 · 14:15 €0.31" versus "E.g. always €0.29 per kWh"); the current price of the chosen entity is shown below the field. The cards sit side by side when there is room (at least 200 px per card), so a step fits without scrolling.
   - **Back** and **Next** buttons; the last step has **Save and find devices**. **Next** is only active when all questions of the step are answered. After saving, the house is recalculated.
2. **Looking…**: three lines with check marks (**Reading your Energy dashboard**, **Finding energy meters**, **Checking history**), so the wait tells you something.
3. Found: a checklist. Only what is certainly right is checked (rules in [Quick start](03-entity-detection.md#quick-start-onboardingpy-energydashsuggest)). Each line shows the name, the type, and in one line what was found ("5 sessions in 7 days, 1.1 kWh on average", "48 W on average, 1.2 kWh per day"). Expanding shows a mini chart of the power, the origin, and **Adjust** (opens flow 3 with the suggestion). Below that is **Also found**, unchecked, with the reason in one sentence ("Measures in the car: … Your charger measures better."). Button **Add {n} devices**.
4. Recalculating: "{n} devices added", a progress bar, and per device waiting, busy, or done, plus a note that baseload already works without a device. When everything is done, the panel goes to the dashboard by itself. If it takes longer than 20 seconds, the text button **Go to dashboard now** appears. The "Recalculating from your history" bar at the top is hidden during the quick start.

- Nothing found: **No energy meters found** with **Choose a meter yourself** (flow 3) and **Search again**.
- The quick start stays open while it runs, even if a device was already added through **Adjust**; that line then shows **Added**.

### 3. Adding a device (adaptive dialog, steps)

1. **Choose an energy meter** (only through the button, not through a discovered suggestion): a search field with the visible label **Search**, and a list with the chip **kWh counter** or **Power only**. No results: **No results** with "Change your search term."
2. **Type of device** (select box): **Sessions**, **Continuous**, or **Charger**, with a suggestion and the reason below the field.
3. **Sources**:
   - **Energy** \* (entity picker with options and chips; **Not recommended** for a slow power sensor).
   - **Start and end of a session** \* (for **Sessions** and **Charger**): **From the power use** or **From an entity**. With an entity: **Session entity** \* and **Session runs while the status is** (chips, at least one, otherwise "Choose at least one status.").
   - **Data check** (a list with ok, limitation, or not recommended, and the consequence).
4. **Session settings** (only for **Sessions** from the power use): a power chart, a choice from the peaks found, derived values (**On from**, **Minimum duration**), the **Done after** slider, direct validation (a success or warning message with icon and text), and a check against your history. **Save** is only active with a valid choice.

- After saving: a toast "Device added".

### 4. Panel with data (tabs, like a Home Assistant subpage; at the bottom on mobile)

- **Dashboard**: period choice (**Week** or **Month**), KPIs (**Whole house**, **Average per day**, **Average power price**, **Saved by solar**), a donut "Where your money goes" (per device plus **Rest of the house**), a donut showing where your power comes from (own solar or grid), "Energy distribution" (only with the P1 meter: a flow diagram of solar, grid, and home, the grid balance, and gauges for net import, self-consumed solar, and self-sufficiency), stacked bars "Cost per day" (per device on a euro axis with gridlines; negative costs below the zero line), stacked bars "Solar per day" (only with solar: used yourself and exported, in kWh; selecting a day also shows the grid power saved and the export earnings in euros), "What do you pay per kWh?" (per device compared with the grid price), and "When do you use power?" (use per hour with the price per hour).
- **Sessions**: a list; selecting a session opens a dialog with the cost, bars per quarter hour (solar or grid), the breakdown (grid, solar, total), an insight, and the expandable block **How is this calculated?** (energy source, solar/grid rule, price rule, check).
- **Baseload**: base load (W, kWh per day), € per month, € per year, the split (explained and unexplained) with advice, and baseload per week.
- **Devices**: a list with type and rule; floating button **Add device**. The device dialog shows sources and the data check; **Delete** leads to the confirmation **Delete device?**, which explains that earlier sessions are kept.
- The gear in the top bar opens **Settings**, a page of its own (not a pop-up) with a back button in the top bar. It asks the same questions as steps 1a to 1c, each topic in its own card (**Electricity price**, **Meters**, **Solar power and export**), followed by the **Testing and maintenance** card. **Save** and **Cancel** are in a bar that stays at the bottom of the screen; after saving, resetting, or importing, you go back to the dashboard. Saving changed settings recalculates the history ("Saved. Your history is being recalculated.").
- If there are devices but the price isn't chosen yet, a warning with **Set electricity price** is shown at the top.

## UI text

- Sentence case. Buttons use a verb: "Add device", "Save", "Next", "Delete", "Cancel", "Close".
- Confirmation dialogs: the title is a question ("Delete device?"), without user input in the title.
- Empty states: "Nothing to show yet" or "No results", plus the next step.
- Keep success messages short: "Device added", "Saved".
- Every input has a visible label; required fields are marked with `*`; help text goes below the field.
- The Dutch translation follows the same rules.

## Visual tokens (prototype)

The build uses the Home Assistant semantic tokens and variables; these are the values from the prototype.

| Role | Light | Dark |
|---|---|---|
| Background | `#fafafa` | `#111111` |
| Card | `#ffffff` | `#1c1c1c` |
| Line | `#e6e6e6` | `#363636` |
| Text / secondary | `#141414` / `#5e5e5e` | `#e6e6e6` / `#b1b1b1` |
| Primary (text, button) | `#006787` (primary-30, contrast ≥ 4.5:1) | `#37c8fd` |
| Primary accent | `#009ac7` (primary-40) | `#18bcf2` |
| Success / warning / error | `#036730` / `#9d3800` / `#b30532` | `#5dc36f` / `#ff9342` / `#fd8f90` |

- Font Roboto; sizes 12, 14, 16, 20, 24, and 28; weight 400 for text, 500 for actions, and 700 for headings.
- Spacing in steps of 4 px; cards with a 12 px radius and a thin border, no shadow; buttons and chips pill-shaped; dialogs with a 24 px radius (a bottom sheet on mobile).
- Deliberate deviation: buttons and link text use `#006787` instead of `#009ac7`, because white on `#009ac7` doesn't meet the text contrast.

### Chart colors (validated for color blindness and contrast)

- Solar `#f36d00` (dark `#c94e00`), grid `#488fc2`.
- Devices in a fixed order; the color follows the device, never the ranking: Wasmachine `#6250d6`, Droger `#e87ba4`, Server `#008300`, Laadpaal `#eda100`, Airco Woonkamer `#1baf7a`, Airco Slaapkamer `#e34948`. Dark: `#9085e9`, `#d55181`, `#008300`, `#c98500`, `#199e70`, `#e66767`.
- Rest of the house: neutral gray (`#989898` / `#7a7a7a`).
- Always a legend, labels, and 2 px spacing between segments (secondary encoding).

## Sources

- https://contributors.home-assistant.io/design/principles/
- https://contributors.home-assistant.io/design/foundations/color/
- https://contributors.home-assistant.io/design/foundations/typography/
- https://contributors.home-assistant.io/design/foundations/spacing/
- https://contributors.home-assistant.io/design/patterns/forms/
- https://contributors.home-assistant.io/design/patterns/empty-states/
- https://contributors.home-assistant.io/design/ui-text/buttons-and-labels/
- https://contributors.home-assistant.io/design/ui-text/messages/
- https://contributors.home-assistant.io/design/users/
