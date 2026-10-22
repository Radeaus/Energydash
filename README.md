# Energydash for Home Assistant

Energydash is a custom integration for [Home Assistant](https://www.home-assistant.io/) with its own panel in the sidebar. The panel shows what electricity costs per device: per wash cycle, per charging session, per day, and in baseload. Costs are calculated with your own dynamic or fixed electricity price, and power from your solar panels is accounted for separately in every measurement step.

For example, you can see what a car charging session cost, how much of it came from your own solar panels, and which part of your bill belongs to the rest of the house.

To look around first, open the [demo](https://radeaus.github.io/Energydash/). It runs the real panel with a simulated household in your browser, without Home Assistant.

Energydash works in any country and currency that Home Assistant supports. It is available in English, Dutch, German, Spanish, and French, and follows the language of your Home Assistant profile.

Current version: 1.0.7 (October 22, 2026). The [changelog](CHANGELOG.md) lists what is in each version.

## Supported devices

Energydash works with any device that has a kWh counter in Home Assistant: a sensor with `device_class: energy` and `state_class: total_increasing` or `total`. Think of smart plugs, chargers, inverters, and the energy counter of a car.

A device with only a power sensor (W) also works, but less accurately. The device's data check warns you when that is the case.

## Prerequisites

1. A smart meter in Home Assistant with an import counter in kWh, such as a P1 meter (`sensor.p1_meter_energy_import`), a HomeWizard, Shelly EM, or Tibber Pulse. It is used to determine, per measurement step, what came from the grid and what came from your own solar panels or battery. The import and export must be separate counters that only go up.
2. An electricity price: a price entity or a fixed price. See [Electricity prices](#electricity-prices) for the integrations that work best.
3. With solar panels: an export counter and, preferably, a production counter. Without them, **Rest of the house** can be off on sunny days.
4. With a home battery: a counter for the energy into the battery and one for the energy out of it, as in the Home Assistant Energy dashboard.
5. [HACS](https://hacs.xyz/), if you want to install through HACS.

### Electricity prices

Any sensor with a price per kWh or per MWh works. The unit is converted automatically: `EUR/kWh`, `ct/kWh`, `öre/kWh`, `p/kWh`, and `EUR/MWh` all work. The price entity should be in the same currency as Home Assistant.

Costs are most accurate when Energydash also knows the prices of the coming quarter hours or hours:

- From an attribute of the price entity: Zonneplan, Nord Pool (HACS), ENTSO-e, EPEX Spot, Amber Electric, Frank Energie, Energi Data Service, and others with a list of start times and prices.
- Through an action, for the integrations in Home Assistant itself that have no such attribute: Nord Pool, Tibber, EnergyZero, and easyEnergy.

Without these, each measurement step gets the price at the moment of measuring. The settings page shows which of the two applies.

## Installation

### Through HACS

1. In HACS, open the menu (⋮) > **Custom repositories**.
2. Enter `https://github.com/Radeaus/Energydash` as **Repository**, choose the type **Integration**, and select **Add**.
3. Search for **Energydash** in HACS and select **Download**.
4. Restart Home Assistant: **Settings** > **System** > ⏻ > **Restart Home Assistant**.

### Manually

1. Copy the `custom_components/energydash` folder to `/config/custom_components/energydash`, for example with the Samba, SSH, or Studio Code Server add-on.
2. Restart Home Assistant.

## Setup

1. Go to **Settings** > **Devices & services** > **Add integration** and choose **Energydash**.
2. Select **Submit**. The integration asks nothing else; **Energydash** now appears in the sidebar.
3. Open **Energydash** and select **Start wizard**.
4. Choose your electricity price:
   - **Price from an entity**. If the entity does not hold the price you pay, such as a bare market price, choose **No, something comes on top** and fill in the **Extra per kWh** and the **VAT (%)**.
   - **Fixed price**: **One price**, or **Normal and low**. With **Normal and low**, you set when the low tariff applies and whether it applies all weekend.

   Each choice shows an example with your own prices.
5. Check your meters. They are taken from your Energy dashboard: **Import from the grid**, **Export to the grid**, **Solar production**, **Energy into the battery**, and **Energy out of the battery**.
6. Choose what power from your own solar panels costs: **What you would otherwise have received** (the export price), **Nothing**, or **The same as grid power**. Power from a home battery counts as your own power too.
7. The quick start finds your energy meters and looks at their history. Check the devices you want to follow and select **Add _n_ devices**.

Result: costs are calculated back over the history Home Assistant has kept, and the dashboard fills up.

To set up a device yourself, choose **Advanced setup**, or later **Add device** on the **Devices** tab. There you choose the meter, the kind of device, and the sources (with a data check), and how sessions are detected, with a preview over the last 7 days.

## Changing settings

Open **Energydash** > **Settings**. It has the same questions as the quick start: electricity price, meters, and what solar power costs. After you save, the history is recalculated automatically.

Under **Testing and maintenance** you'll find:

- **Recalculate everything**: replaces all results with a recalculation over the history. Devices and settings stay.
- **Export settings** and **Import settings**: save your devices and price settings as a JSON file, and restore them later in one go.
- **Clear calculated data**: removes sessions and costs, keeps devices and price settings.
- **Reset Energydash**: removes devices and data, keeps price settings.

## What Energydash provides

### Panel

- **Dashboard**: costs per week, month, and year, with cost per day, the average electricity price, what you pay per kWh, and a **Solar** card (share of own solar, produced, exported, saved). **Energy distribution** shows how power flowed between your solar panels, the grid, and your home. **Energy balance** shows the grid balance, the net import, the share of solar you used yourself, and your self-sufficiency. **Solar per day** shows for each day what your panels produced, split into what you used yourself and what you exported. Every number has an explanation.
- **Sessions**: every wash cycle or charging session with energy, cost, solar, and grid. **How is this calculated?** shows the breakdown per quarter hour.
- **Baseload**: what your house uses at night, per day, month, and year.
- **Devices**: your devices with color, icon, data check, and the latest counter steps.

The panel is available in English, Dutch, German, Spanish, and French, follows the light or dark theme of Home Assistant, and works on a phone. Only administrators can change anything.

### Sensors

Per device:

- **Cost today**
- **Cost this month**
- **Last session** (for devices with sessions)

For the house:

- **Whole house cost today**
- **Rest of the house cost today**
- **Baseload**

The cost sensors carry the energy and costs behind the number as attributes: `kwh`, `solar_kwh`, `grid_kwh`, `grid_cost`, `solar_cost`, `cost_all_grid`, and `price_per_kwh`. **Last session** also has `start` and `end`.

### Actions

- `energydash.recalculate`: recalculates over the history. With `device_id` only that device, without it all devices and the house.
- `energydash.reset`: clears calculated data (`scope: data`) or all devices as well (`scope: all`).

Use them in automations or through **Developer tools** > **Actions**.

### Events

When a session ends, Energydash fires the event `energydash_session_ended`. It carries `device_id`, `device_name`, `start`, `end`, `duration_min`, `kwh`, `solar_kwh`, `grid_kwh`, `cost`, `grid_cost`, `cost_all_grid`, and `price_per_kwh`. `cost` follows your choice of what solar power costs, like the **Last session** sensor. The event also appears in the logbook.

For example, to get a notification when a charging session ends:

```yaml
triggers:
  - trigger: event
    event_type: energydash_session_ended
    event_data:
      device_id: charger
actions:
  - action: notify.notify
    data:
      message: >-
        Charged {{ trigger.event.data.kwh }} kWh
        for {{ '%.2f' | format(trigger.event.data.cost) }}
```

Replace `charger` with the ID of your device. To find it, go to **Developer tools** > **Events**, listen to `energydash_session_ended`, and wait for a session to end.

### Long-term statistics

For each device, **Whole house**, and **Rest of the house**, Energydash keeps the cost and energy per hour in the long-term statistics of Home Assistant: `energydash:cost_<device>` and `energydash:energy_<device>`. They go back as far as the calculated history, up to a year, and are rewritten after each recalculation.

To show them, add a **Statistics graph** card to a dashboard, search for the device name followed by "cost" or "energy", and choose a period like **Day** or **Month** with the **Change** statistic type. The energy statistics can also be added to the Energy dashboard under **Individual devices**.

## How costs are calculated

- Energy comes from kWh counters, not from power. A power value that updates slowly (like a cloud-connected charger, every 5 minutes) misses energy at every start and counts solar that wasn't there at every stop.
- In each measurement step, what the smart meter imported in the same interval came from the grid; the rest of the device's consumption is your own power, from solar panels or a home battery. Own power covers the rest of the house first.
- The price is time-weighted per quarter hour: a measurement step that spans two quarters is split over both quarter-hour prices by time.
- With an extra per kWh and VAT, the price is (entity price + extra) × (1 + VAT). The export price never gets the extra or VAT.
- Each device is its own series. Whatever does not belong to a device is **Rest of the house**.
- Everything is calculated locally in Home Assistant. Nothing is sent to the cloud.

The full [calculation method](docs/02-calculation-method.md) includes the validation against real data.

## Data updates

Energydash does not poll any external service. Costs are updated as soon as a device counter changes, and the house every minute. Sensors are updated right after each calculation. Open sessions and intermediate values are kept when Home Assistant restarts.

## Known limitations

- Detailed back-calculation is only possible over the history the recorder keeps (10 days by default). Before that, up to a year back, costs are calculated per hour from the long-term statistics.
- Two devices running at the same time are each matched against the same P1 import. With a lot of solar power, the sum of their grid power can come out slightly higher than what the P1 meter imported. **Rest of the house** absorbs this and never goes negative.
- The last measurement step when a charger is unplugged can be lost if its session counter jumps straight to 0.
- **Whole house** can differ a few percent from the Home Assistant Energy dashboard, because that dashboard uses hourly prices.
- Only one Energydash can be set up per Home Assistant.
- The long-term statistics of an hour are written shortly after that hour ends, so the current hour is not in them yet.
- Costs are energy costs per kWh. Fixed costs per month or day, a capacity tariff (Belgium), and grid fees per kW are not included.
- A fixed price has at most two tariffs. For three or more periods, make a template sensor with the price of the moment and choose **Price from an entity**.
- A single net meter that counts down while you export is not supported. Energydash needs separate counters for import and export, and shows a repair when the import counter goes down.
- Losses in a home battery are not counted separately: what comes out of the battery counts as own power, what goes in is not part of the house's use.

## Troubleshooting

<details>
<summary>The panel still looks old after an update</summary>

Your browser still shows the previous version of the panel.

1. Restart Home Assistant after every update through HACS.
2. Refresh the page with Ctrl+F5.

</details>

<details>
<summary>A repair "Energydash cannot find …" appears</summary>

An entity that Energydash uses no longer exists, for example after a device was renamed or removed.

1. Open **Energydash** and choose another source for the device or in **Settings**.
2. Or restore the entity in Home Assistant.

</details>

<details>
<summary>All costs are 100 or 1000 times too high or too low</summary>

The unit of the price entity is not recognized, so the price is read in the wrong unit.

1. Open **Energydash** > **Settings** and look at the line below the price entity. It shows the current price per kWh and, if the unit is converted, the unit.
2. If the price there is wrong, make a template sensor with the price per kWh in your main currency, with a unit like `EUR/kWh`, and choose that one.

</details>

<details>
<summary>A repair "Your import meter also counts down" appears</summary>

Your import counter goes down while you export, which happens with a single net meter. Energydash reads every drop as a new counter, so costs come out too high.

1. Check whether your smart meter integration has separate counters for import and export. Most have.
2. Choose those in **Energydash** > **Settings**, under **Import from the grid** and **Export to the grid**.

</details>

<details>
<summary>The cost of a device looks wrong</summary>

1. Open the device on the **Devices** tab and look at the **Data check**. It shows whether there is a kWh counter and how solar and grid are determined.
2. Look at the **Latest counter steps**: per step the time, kWh, import from the smart meter, grid, solar, and price.
3. Select **Recalculate** for the device.
4. Turn on debug logging through **Settings** > **Devices & services** > **Energydash** > **Enable debug logging**. Download the diagnostics from the same menu and attach both to an [issue on GitHub](https://github.com/Radeaus/Energydash/issues).

</details>

## Removing Energydash

1. Go to **Settings** > **Devices & services** > **Energydash**.
2. Select the menu (⋮) > **Delete**.

All data stored by Energydash (`.storage/energydash.*`) is removed as well. If you installed through HACS, also remove Energydash in HACS and restart Home Assistant.

## Contributing

To work on the code, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Energydash is released under the [MIT License](LICENSE).
