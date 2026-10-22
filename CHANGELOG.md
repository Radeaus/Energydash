# Changelog

## 1.0.8 – October 22, 2026

Nothing changes in how Energydash works or calculates. You only need this update if you want the version number to match.

### New

- A [live demo](https://radeaus.github.io/Energydash/) shows the panel with a simulated household in your browser, in all five languages, without Home Assistant.
- Energydash is now released under the MIT License.

## 1.0.7 – October 22, 2026

### Before you update

- The attributes of the cost sensors are renamed to match the session event: `zon_kwh` is now `solar_kwh`, `net_kwh` is `grid_kwh`, `net_cost` is `grid_cost`, and `zon_cost` is `solar_cost`. Update automations or templates that use the old names.

### New

- Energydash is now also available in German, Spanish, and French: the panel, the setup, the sensor names, the repairs, the actions, and the logbook.
- A price entity in cents, öre, pence, or per MWh is converted to your currency per kWh automatically. The settings show the unit that was converted.
- Prices of the coming hours are fetched through an action for Nord Pool, Tibber, EnergyZero, and easyEnergy in Home Assistant, so a step that spans several quarter hours gets the right prices.
- Forecast prices from Amber Electric, EPEX Spot, Energi Data Service, and similar integrations are recognized.
- With **No, something comes on top**, you can fill in a **VAT (%)** next to the **Extra per kWh**.
- With a fixed price with **Normal and low**, you choose when the low tariff starts and ends, and whether it applies all weekend.
- A home battery is supported: add **Energy into the battery** and **Energy out of the battery** under **Meters**. Power from the battery counts as your own power, and charging from the grid no longer counts as use of the house.
- A repair appears when the import counter goes down while you export, which happens with a single net meter.
- The attributes of the sensors have names in English and Dutch.

### Improved

- Texts say "smart meter" instead of "P1 meter", so they also make sense outside the Netherlands and Belgium.
- Labels show the currency of your Home Assistant instead of always the euro sign.
- Error messages in the panel say what to fix instead of showing a code.
- Washing machines, fridges, heat pumps, and chargers are also recognized by German, French, Spanish, Italian, and Scandinavian names.
- The logbook entry of a session follows the language of Home Assistant.

## 1.0.6 – October 22, 2026

### New

- When a session ends, Energydash fires the event `energydash_session_ended` with the energy, solar, grid, and cost of the session, so you can send a notification or start an automation.
- Session ends appear in the logbook with their energy and cost.
- The cost and energy per hour of each device, **Whole house**, and **Rest of the house** are kept in the long-term statistics of Home Assistant, so you can show them in a **Statistics graph** card or the Energy dashboard, up to a year back.

## 1.0.5 – October 22, 2026

### Improved

- **Energy distribution** is now two cards side by side, between **Cost per day** and **Solar per day**: the flow diagram in **Energy distribution**, and the grid balance with the gauges in **Energy balance**.

## 1.0.4 – October 22, 2026

### New

- **Solar per day** is a separate chart that shows for each day what your solar panels produced, split into what you used yourself and what you exported. Selecting a day also shows how much grid power that saved and what the export earned.

### Improved

- **Cost per day** has a euro axis with gridlines and a clear zero line, and no longer shows solar below the line, so the chart is calmer to read.
- **Energy distribution** has a cleaner layout: the lines run neatly between solar, grid, and home, and the gauges sit in one row below the grid balance.
- Selecting a day in **Cost per day** or **Solar per day** highlights the same day in both charts.

## 1.0.3 – October 22, 2026

### New

- The dashboard has an **Energy distribution** card, like the Home Assistant Energy dashboard: a flow diagram of solar, grid, and home, the **Grid balance**, and gauges for **Net imported from the grid**, **Self-consumed solar**, and **Self-sufficiency**.
- **Cost per day** shows below the line what your solar panels were worth each day: the grid power you didn't have to buy and your export earnings. Selecting a day shows the solar kWh and both amounts.

## 1.0.2 – October 22, 2026

### Improved

- The Energydash icon is simpler: a white lightning bolt, centered on green, without the euro coin.

## 1.0.1 – October 22, 2026

### New

- Energydash has its own icon: a green lightning bolt with a euro coin.

### Improved

- The step count in the quick start now covers the whole wizard, including choosing devices and calculating them back, instead of only the first steps.
- A progress bar under the header shows how far along you are in the quick start.

## 1.0.0 – October 22, 2026

First version.

### New

- When you first open the panel, the quick start finds your energy meters, sets them up based on their history, and shows them as a checklist. For each device you see what was found, like "5 sessions in 7 days, 1.1 kWh on average", with a small chart when you expand it.
- Doubtful cases, such as a meter with only power, a counter in the car, or a duplicate charger, are listed separately with the reason.
- One button adds all checked devices and calculates them back together.
- You choose your electricity price as **Price from an entity** (with an optional markup per kWh, for example for a bare wholesale price) or as **Fixed price** (**One price** or **Normal and low**). Each choice shows an example with your own prices.
- You choose what power from your own solar panels costs: **What you would otherwise have received**, **Nothing**, or **The same as grid power**. You can switch this later.
- The export price comes from your price entity, from another entity, or from a fixed amount.
- Your meters are taken from the Energy dashboard. Several counters per meter, such as normal and low tariff or several inverters, are added up.
- **Settings** is a page of its own with the same questions as the quick start. After you save, the history is recalculated automatically.
- The integration setup in Home Assistant asks nothing: you set everything up in the panel.
- With **Advanced setup** and **Add device** you choose the meter, the kind of device, and the sources yourself (with a data check), and set up sessions with a preview over the last 7 days.
- Costs are calculated from kWh counters, with power as a fallback. Counter resets are detected. Solar and grid are determined per measurement step with the P1 import counter, and the price is time-weighted per quarter hour. All rules are in the [calculation method](docs/02-calculation-method.md).
- For slow counters, like the counter in a Tesla, a measurement step covers at least the usual update interval, so no solar is counted that wasn't there.
- With a production counter, solar per measurement step is never more than what the panels delivered to the house in that interval.
- Measurement steps above 25 kW are ignored, so charging on the road doesn't count for a counter in the car.
- Forecast prices from Zonneplan, Nord Pool, and similar formats are recognized, with automatic unit correction.
- If the recorder doesn't keep the forecast prices, the export price for the history is derived from the electricity price.
- Sessions are detected from consumption (threshold, "done after" up to 4 hours, minimum duration) or from the state of an entity. A device can also be followed continuously.
- Baseload is the quietest hour between 02:00 and 05:00 each night, as the median over 7 nights and without devices that have sessions.
- History goes back up to a year: the recorder is supplemented with the Home Assistant long-term statistics, per hour.
- Open sessions and intermediate values are kept when Home Assistant restarts.
- The dashboard shows a week (calendar week), month, or year, with cards for cost per day, the average electricity price, what you pay per kWh, and **Solar** (share of own solar, produced, exported, and saved).
- Every number has an explanation in a tooltip.
- Every session has **How is this calculated?**, and the **Baseload** and **Devices** tabs show the baseload, counter steps, and a color and icon per device.
- Under **Testing and maintenance** you can recalculate everything, export and import settings, clear calculated data, and reset Energydash.
- The panel is available in English and Dutch, follows the light or dark theme of Home Assistant, and works on narrow screens.
- Each device gets sensors for the cost today, this month, and of the last session. The house gets sensors for the total cost, the rest of the house, and the baseload.
- Diagnostics can be downloaded, and a repair appears under **Repairs** when an entity in use has disappeared.
- The actions `energydash.recalculate` and `energydash.reset` let you recalculate or clear data from an automation.
- Removing the integration also removes all stored data.
