# Bucket test and meter field check: a field guide

A 20-minute test with a drum, a phone and the farmer's permission. It does two jobs:

| Tool in the app | Job |
|---|---|
| **Bucket test** (calibrate) | Replaces the default pump efficiency (40%) with the *real* one, so the virtual meter fits this pump. Changes the numbers. |
| **Meter field check** | Compares the app's prediction with a real measurement and stores the difference. Changes nothing. It is your **evidence**. |

## What to bring

- A **200-litre drum** (or 100 L; a 20 L bucket only if the flow is small).
- A way to send **all** the pump's water into it: the outlet pipe, a hose or the end of the channel.
- Your phone: **Clock → Stopwatch**, camera, and the PaaniPulse app. A marker to draw a fill line.
- A pen and paper (the sheet below) as a backup.

## Before the test (2 minutes)

1. Ask permission, and let **the farmer operate the pump**. Stay clear of wires and the solar controller.
2. **Photograph** the pump nameplate (kW) and the solar controller screen.
3. Ask the farmer **how far down the water stands** (feet), not how deep the bore is. Put it in the app's pump details.
4. Choose a **clear, sunny time between 11:00 and 14:00**. Haze and cloud make the sunlight estimate wrong.
5. Let the pump run for **5 minutes** so the flow is steady.

## The test (10 minutes)

1. **Read the controller screen** and note the **kW** (and Hz if shown). Take a photo.
2. **Mark a fill line** on the drum: pour in a known amount first (e.g. ten 20-litre buckets) and draw the line. A "200 L drum" often holds 210–220 L when full, so measure it.
3. Empty the drum. Put the pipe so that **every drop** goes in.
4. **Start the stopwatch the moment water enters the drum. Stop it when it reaches the line.** Have someone film the drum and the stopwatch together: this video is your proof.
5. Repeat **3 times** and use the **average seconds**.
6. Note the time of day and the sky (clear / hazy / cloudy).

**Quick sanity check:** flow (L/h) = litres ÷ seconds × 3600. 200 L in 24 s is 30,000 L/h.
- Under **10 seconds**: too fast to time well, use a bigger container.
- Over **2 minutes**: very weak flow, or some water is going elsewhere (a branch, a leak, a half-full pipe).

## Put it in the app

Farm dashboard, then:

1. **Meter field check** first (this measures the *uncalibrated* error): drum litres, seconds, hour, and the **inverter kW** if you have it. Tap **Compare**. Example result: *"App predicted 34,145 L/h · you measured 30,000 L/h → app 14% high."*
2. Then the **Bucket test** card with the same numbers (and the inverter kW) → **Calibrate**. The pump's efficiency is replaced and the badge changes to **Calibrated**.
3. Later (another hour, e.g. 10:00 or 15:00) do another **Meter field check**. The dashboard then shows *"before calibration X% · after Y%"*. That sentence is what you tell the judges.

**Always enter the inverter kW when you can.** Without it the app estimates power from sunshine; in our test that estimate was 11% off from the controller's reading, which feeds straight into the efficiency.

## Fill in this sheet

| Time | Sky | Inverter kW | Drum litres | Seconds (3 runs) | Average s | L/h | App predicted L/h | Difference % |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

Also note: pump kW, panel kWp, water level (ft), district, farmer's first name (only with permission), date.

## Common mistakes

- Bore depth entered instead of **water level**: the lift (and so the flow) is wrong.
- Not all of the water goes into the drum.
- Starting the stopwatch late, or stopping at the rim instead of the marked line.
- Calibrating in haze or at 8 AM / 5 PM, when power is low and changing.
- Expecting one efficiency to be perfect all day: at low sun the pump runs slower, so the error grows. Calibrate near midday and say so.

## At the hackathon (no pump there)

- **Never present example numbers as a measurement.** If you did a real test, show the **video** and the sheet. If not, say clearly *"these are example numbers; the field check is our next step."*
- A **tap is far too weak** for the test: a tap gives about 10–15 litres a minute, a solar pump about 500 litres a minute. Entering tap numbers would make the app calibrate to a nonsense efficiency.
- To show the idea on stage, use a **20-litre bottle and a stopwatch** as a prop, then enter the example *200 L in 22 s* and explain it is "what we do at a real pump".

## کسان کے لیے مختصر ہدایات (بالٹی ٹیسٹ)

1. دوپہر 12 بجے کے قریب، صاف دھوپ میں پمپ کو 5 منٹ چلنے دیں۔
2. پائپ کا سارا پانی ڈرم میں ڈالیں، ڈرم پر بھرنے کی لکیر لگائیں۔
3. موبائل کے اسٹاپ واچ سے گنیں کہ ڈرم کتنے سیکنڈ میں بھرا۔ تین بار کریں اور اوسط لیں۔
4. سولر کنٹرولر کی اسکرین پر کلو واٹ پڑھیں۔
5. ایپ میں ڈرم کا سائز، سیکنڈ اور وقت لکھیں، پھر "میٹر درست کریں" دبائیں۔

## Safety

Do not touch electrical parts. The farmer switches the pump. Keep children and animals away, keep the drum stable, and never
stand in water near the pump's electrical supply.
