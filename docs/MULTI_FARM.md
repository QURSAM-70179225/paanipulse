# Several farms in one account, and always-visible probe and pump cards

## Several farms in one account

A farmer can now have many farms (up to **10** per account) and move between them.

- **Add a farm** (button in the farm page header, and on the My farms page): the same farm form, with an optional **farm name**
  ("North field"). Several farms in one account can then be told apart.
- **Switch farms:** a drop-down in the farm page header lists the farmer's farms; choosing one opens that farm's own page.
- **My farms** (`/farmer/farms`): all farms at a glance. For each: today's advice, the pump (ON, OFF or "not connected") and the latest soil
  moisture from the probe, and a button to open it. `/farmer` shows this page when there is more than one farm.
- Each farm keeps its own advice, weather location, crop, soil probe and pump. Nothing is shared between farms.

## Each farm has its own motor, control box and probe

One account can control **several motors separately**, because every farm has its own pump, and the pump has its own control box and
probe. A control box or probe names the farm it belongs to (`farmId`), so:

- starting, stopping and automatic stop on farm A never touch farm B (tested: two simulated control boxes in one account; starting A
  then B, then stopping A left B running);
- each farm's page shows only its own pump card, and the My farms page shows them side by side;
- each box and probe uses its own SIM and reports directly to the server over the mobile network. No phone is needed.

**Limits:**
- **One motor per farm.** A farm with two motors is not supported yet: the app uses the farm's first pump. For two motors, register two farms.
- **One shared device key.** All control boxes and probes use the same `TELEMETRY_INGEST_KEY`. A key per device would be safer, so a lost
  device could be revoked on its own. Not built.
- **Installer enables remote control.** For safety only an installer can switch remote pump control on for a pump. A farm the farmer
  added himself has no installer, so its remote control stays off until an installer is attached to it. This is a gap to settle for the pilot.

## Always-visible probe and pump cards

The **Soil probe** and **Pump control** cards now always show on the farm page, in a **dull** state (muted, dashed border, buttons disabled)
when nothing is connected, so people can see that the features exist and what they need:

- **Pump control** says why it is dull: *not available on this site yet* (the server has remote control switched off) or *not connected, your
  installer switches it on after the control box is fitted*. Start and Stop are disabled.
- **Soil probe** and **Pump control box** are two separate cards. Each says nothing is linked yet, and the farmer links that device there with the code on its box.

They turn to their normal look as soon as a probe sends readings or the installer enables remote control. The earlier small footer
link and the `?probe=1` address are no longer needed.

## Where the code is

| | |
|---|---|
| Farm name and label | `Farm.nickname` (migration `farm_nickname`), `lib/services/farmLabel.ts` |
| Switcher | `components/farmer/FarmSwitcher.tsx` |
| My farms page | `app/farmer/farms/page.tsx` |
| Dull pump card | `components/farmer/PumpControlPlaceholder.tsx` |
| Dull probe card | `ProbeConnect` (muted when there are no readings) |
| Farm cap | `app/api/farms/route.ts` |
| Tests | `tests/farmLabel.test.ts` |
