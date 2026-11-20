# Water chart: how much water, from standard tables (open loop)

> **Open loop.** The mentors asked for a design that works from what the farmer already knows, with no live sensor feedback.
> The **water chart** does exactly that: the farmer picks his **crop, growth stage, soil type, season, irrigation method
> and land**, and the chart gives the water: how often, how many millimetres, and how many litres for his land.
> No sensors, no weather feed, no internet.

Try it in the app at **`/water-chart`** (public, no sign-in, in Urdu and English). The tables below are printed by
`npm run water:chart` from the same code, so the page and this document always agree.

## How the numbers are made

They use the same FAO-56 method as the daily advice, with a *typical* evapotranspiration for the season in place of today's weather:

- **Crop water use** `ETc = Kc × ET₀`. `Kc` is the FAO-56 crop coefficient at the middle of the growth stage; `ET₀` is a typical
  value for the season: **cool (Nov–Feb) 2, mild (Mar, Oct) 4, hot (Apr–Sep) 6 mm per day** (plausible for the Punjab plains;
  May and June can be higher, and these should be adjusted locally).
- **Soil store** `TAW = root depth × available water per metre`. The root depth grows through the season. The soil holds
  **sand 80, sandy loam 120, loam 140, clay 160 mm per metre**: typical rounded values after the ranges in FAO-56 Table 19.
  **A soil test or an agriculture officer should confirm the farmer's soil.** (`loam` is the value the app always used.)
- **Irrigate when** the readily available share of that store is used (`RAW = p × TAW`, `p` from FAO-56 for each crop), so
  **gap = RAW ÷ ETc**, and **depth = RAW** (net). The depth is then divided by the efficiency of the irrigation method
  (flood 55%, furrow 65%, sprinkler 75%, drip 90%) to give what must be applied at the field.
- **Volume for his land** = depth (mm) × area; 1 mm over one acre is about 4,047 litres.
- **Cap:** the chart never suggests a gap of more than **30 days**. Where the simple model gives a longer gap, it says to water
  every 30 days and put back only what the crop used.
- **Flooded rice** is a daily top-up (crop use plus 4 mm of seepage); soil type does not change it.

## What it is not

- It does **not** use today's weather, rain or any sensor. The daily advice on the farm page does, so it is more exact.
  Use the chart for planning, or when there is no data at all.
- ET₀ values and soil values are typical, not measured for a farm. Real fields differ.
- It does not say anything about fertiliser.

## Precision traded for cost and simplicity

This is the trade the mentors described: a little precision for a large drop in cost and complexity. The chart's answer is a
sensible average; the farm-page advice then adds real weather; a soil probe is an **optional** third layer for farmers who
want it. How much precision is lost is **not yet measured**. The pilot will compare the advice with real soil-moisture
readings (for example from WIT's soil sensors) to put a number on it.

## The tables

Per acre, flood irrigation. Each soil cell reads: *irrigate every N days, with X mm at the field each time*.
For other methods run `npm run water:chart -- furrow` (or `sprinkler`, `drip`).

### Wheat (flood irrigation, per acre)

Each soil cell reads: *irrigate every N days, with X mm at the field each time*.

| Stage | Season | Crop use (mm/day) | Litres per acre per day | Sand | Sandy loam | Loam | Clay |
|---|---|---|---|---|---|---|---|
| initial | cool (Nov–Feb) | 0.8 | 5,886 | every 20 d, 30 mm | every 30 d, 44 mm | every 30 d, 44 mm | every 30 d, 44 mm |
| initial | mild (Mar, Oct) | 1.6 | 11,942 | every 10 d, 30 mm | every 15 d, 46 mm | every 18 d, 53 mm | every 20 d, 61 mm |
| initial | hot (Apr–Sep) | 2.4 | 17,913 | every 6 d, 30 mm | every 10 d, 46 mm | every 12 d, 53 mm | every 13 d, 61 mm |
| development | cool (Nov–Feb) | 1.5 | 11,405 | every 23 d, 66 mm | every 30 d, 85 mm | every 30 d, 85 mm | every 30 d, 85 mm |
| development | mild (Mar, Oct) | 3.1 | 23,496 | every 11 d, 66 mm | every 17 d, 100 mm | every 20 d, 116 mm | every 23 d, 133 mm |
| development | hot (Apr–Sep) | 4.6 | 36,147 | every 7 d, 66 mm | every 11 d, 100 mm | every 13 d, 116 mm | every 15 d, 133 mm |
| mid-season | cool (Nov–Feb) | 2.3 | 16,923 | every 22 d, 96 mm | every 30 d, 125 mm | every 30 d, 125 mm | every 30 d, 125 mm |
| mid-season | mild (Mar, Oct) | 4.6 | 33,994 | every 11 d, 96 mm | every 17 d, 144 mm | every 20 d, 168 mm | every 22 d, 192 mm |
| mid-season | hot (Apr–Sep) | 6.9 | 52,298 | every 7 d, 96 mm | every 11 d, 144 mm | every 13 d, 168 mm | every 15 d, 192 mm |
| late | cool (Nov–Feb) | 1.5 | 10,669 | every 30 d, 79 mm | every 30 d, 79 mm | every 30 d, 79 mm | every 30 d, 79 mm |
| late | mild (Mar, Oct) | 2.9 | 21,338 | every 18 d, 96 mm | every 27 d, 144 mm | every 30 d, 158 mm | every 30 d, 158 mm |
| late | hot (Apr–Sep) | 4.4 | 32,375 | every 12 d, 96 mm | every 18 d, 144 mm | every 21 d, 168 mm | every 24 d, 192 mm |

### Rice (flood irrigation, per acre)

Flooded paddy: top up every day (crop use + seepage). Soil type does not change it.

| Stage | Season | Crop use (mm/day) | Add each day (mm at the field) | Litres per acre per day |
|---|---|---|---|---|
| initial | cool (Nov–Feb) | 2.1 | 11 | 44,883 |
| initial | mild (Mar, Oct) | 4.2 | 15 | 60,335 |
| initial | hot (Apr–Sep) | 6.3 | 19 | 75,787 |
| development | cool (Nov–Feb) | 2.3 | 11 | 45,987 |
| development | mild (Mar, Oct) | 4.5 | 15 | 62,542 |
| development | hot (Apr–Sep) | 6.8 | 20 | 79,098 |
| mid-season | cool (Nov–Feb) | 2.4 | 12 | 47,091 |
| mid-season | mild (Mar, Oct) | 4.8 | 16 | 64,750 |
| mid-season | hot (Apr–Sep) | 7.2 | 20 | 82,409 |
| late | cool (Nov–Feb) | 2 | 11 | 43,780 |
| late | mild (Mar, Oct) | 3.9 | 14 | 58,128 |
| late | hot (Apr–Sep) | 5.9 | 18 | 72,476 |

### Maize (flood irrigation, per acre)

Each soil cell reads: *irrigate every N days, with X mm at the field each time*.

| Stage | Season | Crop use (mm/day) | Litres per acre per day | Sand | Sandy loam | Loam | Clay |
|---|---|---|---|---|---|---|---|
| initial | cool (Nov–Feb) | 0.6 | 4,415 | every 30 d, 33 mm | every 30 d, 33 mm | every 30 d, 33 mm | every 30 d, 33 mm |
| initial | mild (Mar, Oct) | 1.2 | 9,120 | every 15 d, 35 mm | every 23 d, 52 mm | every 27 d, 61 mm | every 30 d, 65 mm |
| initial | hot (Apr–Sep) | 1.8 | 13,680 | every 10 d, 35 mm | every 15 d, 52 mm | every 18 d, 61 mm | every 21 d, 70 mm |
| development | cool (Nov–Feb) | 1.5 | 11,037 | every 23 d, 63 mm | every 30 d, 82 mm | every 30 d, 82 mm | every 30 d, 82 mm |
| development | mild (Mar, Oct) | 3 | 22,227 | every 11 d, 63 mm | every 17 d, 94 mm | every 20 d, 110 mm | every 23 d, 126 mm |
| development | hot (Apr–Sep) | 4.5 | 34,195 | every 7 d, 63 mm | every 11 d, 94 mm | every 13 d, 110 mm | every 15 d, 126 mm |
| mid-season | cool (Nov–Feb) | 2.4 | 17,659 | every 18 d, 80 mm | every 27 d, 120 mm | every 30 d, 131 mm | every 30 d, 131 mm |
| mid-season | mild (Mar, Oct) | 4.8 | 35,410 | every 9 d, 80 mm | every 13 d, 120 mm | every 16 d, 140 mm | every 18 d, 160 mm |
| mid-season | hot (Apr–Sep) | 7.2 | 56,656 | every 6 d, 80 mm | every 9 d, 120 mm | every 10 d, 140 mm | every 12 d, 160 mm |
| late | cool (Nov–Feb) | 1.5 | 11,405 | every 28 d, 80 mm | every 30 d, 85 mm | every 30 d, 85 mm | every 30 d, 85 mm |
| late | mild (Mar, Oct) | 3.1 | 23,607 | every 14 d, 80 mm | every 21 d, 120 mm | every 24 d, 140 mm | every 28 d, 160 mm |
| late | hot (Apr–Sep) | 4.6 | 35,410 | every 9 d, 80 mm | every 14 d, 120 mm | every 16 d, 140 mm | every 18 d, 160 mm |

### Cotton (flood irrigation, per acre)

Each soil cell reads: *irrigate every N days, with X mm at the field each time*.

| Stage | Season | Crop use (mm/day) | Litres per acre per day | Sand | Sandy loam | Loam | Clay |
|---|---|---|---|---|---|---|---|
| initial | cool (Nov–Feb) | 0.7 | 5,151 | every 30 d, 38 mm | every 30 d, 38 mm | every 30 d, 38 mm | every 30 d, 38 mm |
| initial | mild (Mar, Oct) | 1.4 | 10,462 | every 17 d, 44 mm | every 26 d, 66 mm | every 30 d, 78 mm | every 30 d, 76 mm |
| initial | hot (Apr–Sep) | 2.1 | 15,693 | every 11 d, 44 mm | every 17 d, 66 mm | every 20 d, 78 mm | every 23 d, 89 mm |
| development | cool (Nov–Feb) | 1.5 | 11,037 | every 30 d, 82 mm | every 30 d, 82 mm | every 30 d, 82 mm | every 30 d, 82 mm |
| development | mild (Mar, Oct) | 3 | 22,784 | every 15 d, 87 mm | every 23 d, 130 mm | every 27 d, 152 mm | every 30 d, 164 mm |
| development | hot (Apr–Sep) | 4.5 | 34,176 | every 10 d, 87 mm | every 15 d, 130 mm | every 18 d, 152 mm | every 21 d, 174 mm |
| mid-season | cool (Nov–Feb) | 2.3 | 16,923 | every 27 d, 113 mm | every 30 d, 125 mm | every 30 d, 125 mm | every 30 d, 125 mm |
| mid-season | mild (Mar, Oct) | 4.6 | 34,934 | every 13 d, 113 mm | every 20 d, 170 mm | every 23 d, 199 mm | every 27 d, 227 mm |
| mid-season | hot (Apr–Sep) | 6.9 | 53,566 | every 9 d, 113 mm | every 13 d, 170 mm | every 15 d, 199 mm | every 18 d, 227 mm |
| late | cool (Nov–Feb) | 1.8 | 12,876 | every 30 d, 95 mm | every 30 d, 95 mm | every 30 d, 95 mm | every 30 d, 95 mm |
| late | mild (Mar, Oct) | 3.5 | 25,753 | every 17 d, 113 mm | every 26 d, 170 mm | every 30 d, 191 mm | every 30 d, 191 mm |
| late | hot (Apr–Sep) | 5.3 | 40,174 | every 11 d, 113 mm | every 17 d, 170 mm | every 20 d, 199 mm | every 23 d, 227 mm |

### Sugarcane (flood irrigation, per acre)

Each soil cell reads: *irrigate every N days, with X mm at the field each time*.

| Stage | Season | Crop use (mm/day) | Litres per acre per day | Sand | Sandy loam | Loam | Clay |
|---|---|---|---|---|---|---|---|
| initial | cool (Nov–Feb) | 0.8 | 5,886 | every 30 d, 44 mm | every 30 d, 44 mm | every 30 d, 44 mm | every 30 d, 44 mm |
| initial | mild (Mar, Oct) | 1.6 | 11,995 | every 15 d, 44 mm | every 22 d, 66 mm | every 26 d, 77 mm | every 30 d, 88 mm |
| initial | hot (Apr–Sep) | 2.4 | 18,346 | every 10 d, 44 mm | every 15 d, 66 mm | every 17 d, 77 mm | every 20 d, 88 mm |
| development | cool (Nov–Feb) | 1.7 | 12,141 | every 28 d, 87 mm | every 30 d, 90 mm | every 30 d, 90 mm | every 30 d, 90 mm |
| development | mild (Mar, Oct) | 3.3 | 24,527 | every 14 d, 87 mm | every 21 d, 130 mm | every 25 d, 152 mm | every 28 d, 173 mm |
| development | hot (Apr–Sep) | 4.9 | 38,324 | every 9 d, 87 mm | every 14 d, 130 mm | every 16 d, 152 mm | every 19 d, 173 mm |
| mid-season | cool (Nov–Feb) | 2.5 | 18,395 | every 24 d, 113 mm | every 30 d, 136 mm | every 30 d, 136 mm | every 30 d, 136 mm |
| mid-season | mild (Mar, Oct) | 5 | 38,261 | every 12 d, 113 mm | every 18 d, 170 mm | every 21 d, 199 mm | every 24 d, 227 mm |
| mid-season | hot (Apr–Sep) | 7.5 | 57,392 | every 8 d, 113 mm | every 12 d, 170 mm | every 14 d, 199 mm | every 16 d, 227 mm |
| late | cool (Nov–Feb) | 2 | 14,716 | every 30 d, 109 mm | every 30 d, 109 mm | every 30 d, 109 mm | every 30 d, 109 mm |
| late | mild (Mar, Oct) | 4 | 29,759 | every 15 d, 113 mm | every 23 d, 170 mm | every 27 d, 199 mm | every 30 d, 218 mm |
| late | hot (Apr–Sep) | 6 | 44,638 | every 10 d, 113 mm | every 15 d, 170 mm | every 18 d, 199 mm | every 20 d, 227 mm |
