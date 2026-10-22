# Energydash for Home Assistant

Energydash is a custom integration for [Home Assistant](https://www.home-assistant.io/) with its own panel in the sidebar. The panel shows what electricity costs per device: per wash cycle, per charging session, per day, and in baseload. Costs are calculated with your own dynamic or fixed electricity price, and power from your solar panels is accounted for separately in every measurement step.

For example, you can see what a car charging session cost, how much of it came from your own solar panels, and which part of your bill belongs to the rest of the house.

Current version: 1.0.0 (October 22, 2026). The [changelog](CHANGELOG.md) lists what is in each version.

## Supported devices

Energydash works with any device that has a kWh counter in Home Assistant: a sensor with `device_class: energy` and `state_class: total_increasing` or `total`. Think of smart plugs, chargers, inverters, and the energy counter of a car.

A device with only a power sensor (W) also works, but less accurately. The device's data check warns you when that is the case.

## Prerequisites

1. A P1 meter in Home Assistant with an import counter in kWh, such as `sensor.p1_meter_energy_import`. It is used to determine, per measurement step, what came from the grid and what came from your own solar panels.
2. An electricity price: a price entity (for example from Zonneplan or Nord Pool, preferably with a forecast attribute holding quarter-hourly or hourly prices) or a fixed price.
3. With solar panels: an export counter and, preferably, a production counter. Without them, **Rest of the house** can be off on sunny days.
4. [HACS](https://hacs.xyz/), if you want to install through HACS.

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
4. Choose your electricity price: **Price from an entity** (with an optional markup per kWh, for example for a bare wholesale price) or **Fixed price** (**One price**, or **Normal and low**). Each choice shows an example with your own prices.
5. Check your meters. They are taken from your Energy dashboard: **Import from the grid**, **Export to the grid**, and **Solar production**.
6. Choose what power from your own solar panels costs: **What you would otherwise have received** (the export price), **Nothing**, or **The same as grid power**.
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

- **Dashboard**: costs per week, month, and year, with cost per day, the average electricity price, what you pay per kWh, and a **Solar** card (share of own solar, produced, exported, saved). **Energy distribution** shows how power flowed between your solar panels, the grid, and your home, with the grid balance, the net import, the share of solar you used yourself, and your self-sufficiency. **Solar per day** shows for each day what your panels produced, split into what you used yourself and what you exported. Every number has an explanation.
- **Sessions**: every wash cycle or charging session with energy, cost, solar, and grid. **How is this calculated?** shows the breakdown per quarter hour.
- **Baseload**: what your house uses at night, per day, month, and year.
- **Devices**: your devices with color, icon, data check, and the latest counter steps.

The panel is available in English and Dutch, follows the light or dark theme of Home Assistant, and works on a phone. Only administrators can change anything.

### Sensors

Per device:

- **Cost today**
- **Cost this month**
- **Last session** (for devices with sessions)

For the house:

- **Whole house cost today**
- **Rest of the house cost today**
- **Baseload**

### Actions

- `energydash.recalculate`: recalculates over the history. With `device_id` only that device, without it all devices and the house.
- `energydash.reset`: clears calculated data (`scope: data`) or all devices as well (`scope: all`).

Use them in automations or through **Developer tools** > **Actions**.

## How costs are calculated

- Energy comes from kWh counters, not from power. A power value that updates slowly (like a cloud-connected charger, every 5 minutes) misses energy at every start and counts solar that wasn't there at every stop.
- In each measurement step, what the P1 meter imported in the same interval came from the grid; the rest of the device's consumption is your own solar power. Solar power covers the rest of the house first.
- The price is time-weighted per quarter hour: a measurement step that spans two quarters is split over both quarter-hour prices by time.
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
<summary>The cost of a device looks wrong</summary>

1. Open the device on the **Devices** tab and look at the **Data check**. It shows whether there is a kWh counter and how solar and grid are determined.
2. Look at the **Latest counter steps**: per step the time, kWh, P1 import, grid, solar, and price.
3. Select **Recalculate** for the device.
4. Turn on debug logging through **Settings** > **Devices & services** > **Energydash** > **Enable debug logging**. Download the diagnostics from the same menu and attach both to an [issue on GitHub](https://github.com/Radeaus/Energydash/issues).

</details>

## Removing Energydash

1. Go to **Settings** > **Devices & services** > **Energydash**.
2. Select the menu (⋮) > **Delete**.

All data stored by Energydash (`.storage/energydash.*`) is removed as well. If you installed through HACS, also remove Energydash in HACS and restart Home Assistant.

## Contributing

To work on the code, see [CONTRIBUTING.md](CONTRIBUTING.md).
