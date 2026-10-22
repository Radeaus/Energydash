# 08 – Install and test

This guide belongs to version 1.0.0 and is meant for testing on a separate test instance of Home Assistant. First install, then the test plan, then what to do when you want to start over.

## Preparation

1. Make a backup of the Home Assistant you are going to test on: **Settings** > **System** > **Backups** > **Create backup**. On the test VM, that is your clean starting point. Also take a Proxmox snapshot afterward.
2. The code is on [GitHub](https://github.com/Radeaus/Energydash). The repository is public, because HACS can't fetch private repositories. Every version is a release with a tag (like `v1.0.0`); HACS shows those versions and reports updates.

## Installation

### Through HACS

1. In HACS, open the menu (⋮) > **Custom repositories**.
2. Enter `https://github.com/Radeaus/Energydash` as **Repository**, choose the type **Integration**, and select **Add**.
3. Search for **Energydash** in HACS, select **Download**, and choose `v1.0.0`.
4. Restart Home Assistant: **Settings** > **System** > ⏻ > **Restart Home Assistant**.

### Manually

Useful on the test VM, without GitHub.

1. Copy the `custom_components/energydash` folder to `/config/custom_components/energydash`, for example with the Samba, SSH, or Studio Code Server add-on.
2. Restart Home Assistant.

## Setup

The integration setup in Home Assistant asks nothing. You set everything up in the panel.

1. Go to **Settings** > **Devices & services** > **Add integration** and choose **Energydash**.
2. Select **Submit**. **Energydash** now appears in the sidebar. Open it and select **Start wizard**.
3. At **Your electricity price**: choose **Price from an entity** and `sensor.zonneplan_current_quarter_hourly_electricity_tariff`. At **Is this the price you really pay?**, choose **Yes, everything is included**, because Zonneplan provides the price including taxes and VAT.
4. At **Your meters**: check **Import from the grid** (`sensor.p1_meter_energy_import`), **Export to the grid** (`sensor.p1_meter_energie_export`), and **Solar production** (`sensor.inverter_omvormer_zolder_energy`). Fill in the last two: without those counters, **Rest of the house** is off on sunny days.
5. At **Solar power and export**: choose **What you would otherwise have received**, then **From your price entity**. The export price is in the Zonneplan forecast.
6. Select **Save and find devices**. The house is calculated back over the history, and the quick start shows your devices. Check what you want to follow and add them in one go.

After an update through HACS, always restart Home Assistant. If the panel still looks old afterward, refresh the browser with Ctrl+F5. Usually that isn't needed, because the panel URL contains a version hash.

## Starting over while testing

There are six levels, from light to heavy. Each level asks for confirmation first.

- **Recalculate one device**: **Devices** > the device > **Recalculate**. The results of that device are replaced with a recalculation over the history. Settings stay.
- **Recalculate everything**: **Settings** > **Testing and maintenance** > **Recalculate everything**. The same for all devices and the whole house.
- **Clear numbers, keep devices**: **Settings** > **Clear calculated data**. Sessions and costs are removed, devices and price settings stay. Measuring starts again.
- **Back to an empty panel**: **Settings** > **Reset Energydash**. Devices and data are removed, price settings stay. The quick start begins again.
- **Set up again in Home Assistant**: **Settings** > **Devices & services** > **Energydash** > ⋮ > **Reconfigure**. At **Clear data**, choose between **Keep everything**, **Clear calculated data, keep devices**, and **Start fresh: remove devices and data**.
- **Completely clean**: **Settings** > **Devices & services** > **Energydash** > ⋮ > **Delete**. This removes the integration and all stored data (`.storage/energydash.*`). Adding it again starts empty.

With **Export settings** you save your devices and price settings as a JSON file. After a reset or reinstall, **Import settings** restores everything in one go and then recalculates everything. That way you don't have to go through the quick start every time.

Recalculating and resetting are also actions, for automations or through **Developer tools** > **Actions**: `energydash.recalculate` (optionally with `device_id`) and `energydash.reset` (`scope: data` or `scope: all`).

## Test plan

### Seeing what happens

- **Debug logging**: **Settings** > **Devices & services** > **Energydash** > **Enable debug logging**. When you turn it off, Home Assistant downloads the log file.
- **Download diagnostics** (same menu): the settings, the tracker status, the latest counter steps per device, and the last 10 sessions. Attach this file to a bug report.
- **Latest counter steps** for a device: per counter step the time, kWh, P1 import, grid, solar, price, and grid cost. Use it to check rules 3 and 4 of the calculation method directly.

### What to check

Work through this list in order.

1. **Setup**: the suggestions are right (P1 meter, export, inverter, quarter-hourly price). In **Settings**, the price source shows that the forecast was found.
2. **Restart during a session**: start the washing machine and restart Home Assistant halfway. The session continues and stays one session (calculation rule 7).
3. **Charger against the automation**: after a charging session, compare the session in Energydash with the notification from `automation.tesla_sessierapport`. The kWh are equal and the costs differ by a few cents at most. This is the criterion from the roadmap.
4. **Washing machine and dryer**: the number of sessions per day matches reality. Pumping out doesn't count as a separate session.
5. **Sunny day**: a device running in the middle of the day gets solar, never at night.
6. **Switching the solar choice** in **Settings**: costs change immediately, also for old sessions. The kWh stay the same.
7. **Counter reset**: the charger counter starts at 0 for each session. In the counter steps you see `reset` and no negative step.
8. **Unavailable**: unplug a smart plug for a moment. Afterward you see one step covering the whole interruption.
9. **Rest of the house** never goes negative, and **Whole house** matches the costs in the Home Assistant Energy dashboard within a few percent (that dashboard uses hourly prices).
10. **Baseload** appears after the first night.
11. **Narrow screen**: open the panel in the app on your phone. The tabs are at the bottom and dialogs open from the bottom.
12. **Not an administrator**: log in as a regular user. You can look, but not change anything.

## Known limitations in 1.0

- Detailed back-calculation is only possible over the history the recorder keeps (10 days by default). Before that, up to a year back, costs are calculated per hour from the long-term statistics.
- Two devices running at the same time each get grid power against the same P1 import (`min(dE, dImport)`). With a lot of solar power, the sum of their grid power can come out slightly higher than the P1 import. **Rest of the house** absorbs this and never goes negative.
- The last measurement step when the charger is unplugged can be lost, because the session counter jumps to 0. The same goes for the energy supplier.
- The integration has not been tested with the Home Assistant test suite (`pytest-homeassistant-custom-component`). The calculation core, the back-calculation, and the detection have. Test on the test VM first.

## Updating and going back to a previous version

- **Updating**: HACS reports a new release. Select **Download** and restart Home Assistant.
- **Going back to a previous version**: HACS > **Energydash** > ⋮ > **Redownload**, choose the previous version, and restart Home Assistant. The storage format has a version number. New versions convert old storage automatically. Going back to an older version is only safe within the same storage version (currently 1).
