# Pitch deck outline

Two versions of the same story: **A: 3 minutes** (final pitch) and **B: 5 minutes** (mentors, extended). Build the 3-minute
deck first; the extra slides in B are the ones marked ➕.

> **One idea per slide. One story: a farmer's free pump, a meter that doesn't exist yet, and what we built.** Big text
> (30 pt or more), few words, real screenshots from `docs/screenshots/`. Use the app's colours (emerald `#047857`,
> sky `#0369a1`) and write key lines in both English and Urdu.

## Timing

| Version | Slides | Talking | Live demo / video | Total |
|---|---|---|---|---|
| **A: final pitch** | 7 | about 1 min 50 s | 70 s | 3:00 |
| **B: mentor session** | 10 | about 3 min | 2 min | 5:00 |

---

## The slides

### 1. Hook (10–15 s)
- **Headline:** *"A farmer we interviewed paid about Rs 2 lakh to chase his water 60–80 feet deeper."*
- **On the slide:** that one line, big. Small: "Solar made pumping free." / "سولر نے پمپ چلانا مفت کر دیا۔"
- **Visual:** a plain background, or a simple drawing of a bore getting deeper.
- **Say:** "He deepened his bore from about 120 to 180–200 feet. Pumping with solar costs nothing, so nobody tells a farmer when to stop."
- **Source:** your farmer interview. Don't name him; say "a farmer we interviewed".

### 2. The problem (25 s)
- **Headline:** *"650,000 solar tube wells. Zero meters."*
- **On the slide (3 facts, big numbers):**
  - **~650,000** solar tube wells in Pakistan *(estimate)*
  - **77%** of 30 matched farm pairs: solar farms pumped more than diesel *(peer-reviewed, 2025)*
  - **0** meters on farm tube wells: nobody can see the aquifer shrinking
- **Visual:** three big numbers. Add the sources in small print.
- **Say:** "Farmers lose fertiliser and pay for deeper bores; the government can't regulate what it can't measure."
- ➕ **B only:** add "Punjab's solarisation scheme will add about 8,000 more wells, with no water accounting."

### 3. Why nothing fixes it today ➕ (15 s)
- **Headline:** *"Advice, hardware, rules: none of them closes the loop."*
- **On the slide:** a 3-row table: advisory apps (advice, no measurement) · hardware flow meters (measure, one well at a time, costly) · regulation (assumes metering that doesn't exist).
- **Say:** "We combine measurement and advice with no hardware."
- *For version A, fold this into slide 2 with one sentence.*

### 4. The solution (25 s)
- **Headline:** *"PaaniPulse: a virtual water meter, and a daily Urdu advisor."*
- **On the slide:** the four steps with icons: **Measure → Advise → Earn → Map.** Under it: "No extra hardware."
- **Visual:** `docs/screenshots/farmer-ur.png` beside the four steps.
- **Say:** "We calculate litres from pump size and sunlight, tell the farmer each morning in Urdu whether to run the pump, show what he saves, and give the Irrigation Department an anonymised map."

### 5. Live demo or video (60–70 s) ★ the centre of the pitch
- **On the slide:** just the QR code and "Try it now: paanipulse.onrender.com". Put the video (`docs/demo/paanipulse-demo.mp4`) one click away.
- **Show, in this order (stop after ~70 s):**
  1. Tap **Farmer (Karamat)**: "yesterday ran 6 h, crop needed 0 → **keep the pump off today**." Tap ▶.
  2. Scroll to the weekly waste card (water, fertiliser, solar energy).
  3. Open the assistant: ask *"kal barish hogi?"* (or use the mic).
  4. Sign in as **Irrigation Dept**: heatmap, MWh wasted, Export CSV.
- **Say little. Let the product talk.** If the network fails, play the video.

### 6. Why you can trust the numbers (15 s)
- **Headline:** *"Code computes. AI only speaks."*
- **On the slide:** a three-box diagram: **FAO-56 + pump physics (tested)** → **numbers** → **AI phrases them; any invented number is blocked.** Add: "Ranges, not false precision. 5-minute bucket test calibrates each pump."
- **Say:** "That's the difference from asking ChatGPT."
- ➕ **B only:** add the 75 unit tests and the offline fallbacks (cached weather, offline advice, SMS, pump-off alarm).

### 7. Who pays (15 s)
- **Headline:** *"Free for farmers. Paid by the people who already serve them."*
- **On the slide:**
  - **Installers**: after-sales service, about Rs 1,000–2,000 per pump per year *(hypothesis)*
  - **Aarhtis / input dealers**: the channel that stays with the farmer
  - **Lenders and the Irrigation Department**: verified usage data per well
- **Say:** "The installer portal and lender report are already built. No installer has committed yet; that's what we're testing next."

### 8. Honest status ➕ (20 s)
- **Headline:** *"What's real, what's simulated, what we haven't proven yet."*
- **On the slide:** three columns: ✅ **Built and tested** · 🟡 **Simulated** (150 regional wells, demo farm drive data) · 🔴 **Not yet measured** (meter accuracy on a real pump, farmer behaviour change).
- **Say:** "We know our weakest point, and our first step is a drum-and-stopwatch field check."
- *For version A, say this sentence in slide 9 instead.*

### 9. Impact and theme fit (15 s)
- **Headline:** *"Making the solar boom sustainable."*
- **On the slide:** *Renewable & Alternative Energy*: solar pumping succeeded; unmanaged, it drains the aquifer it depends on. PaaniPulse reports **MWh of solar energy wasted** lifting water the crop didn't need, and what spare energy could earn.
- **Visual:** the authority dashboard screenshot with the **5.6 MWh** card highlighted.
- **Scale, only as an illustration (say so on the slide):** "If each of 650,000 wells wasted 1–3 hours a day for 150 days, that is on the order of 0.7–2 TWh of solar energy a year." *Assumptions are ours, not measured.* Remove this line if you can't defend it.

### 10. Next steps, team and ask (15 s)
- **Headline:** *"Next: prove it on a real pump."*
- **On the slide:** **This week** field check on one real pump · 5–10 farmers for two weeks, free · one installer commitment. **Ask:** *an introduction to a solar installer or a pump to test on.* Team: Qursam Bibi, Muzammil Hussain. QR + `github.com/QURSAM-70179225/paanipulse`.
- **Say:** the closing line, slowly: **"Solar made pumping free. PaaniPulse makes it smart."**

---

## Version A (3 minutes): use slides 1, 2, 4, 5, 6, 7, 10

| Slide | Time |
|---|---|
| 1 Hook | 0:00 – 0:12 |
| 2 Problem (+ one sentence on why existing tools fall short) | 0:12 – 0:40 |
| 4 Solution | 0:40 – 1:05 |
| 5 Live demo / video | 1:05 – 2:15 |
| 6 Trust the numbers (+ one honest-status sentence) | 2:15 – 2:30 |
| 7 Who pays | 2:30 – 2:45 |
| 10 Next steps, ask, closing line | 2:45 – 3:00 |

## Appendix (keep hidden, for Q&A)

- **A1 Architecture:** the diagram in [ARCHITECTURE.md](../ARCHITECTURE.md) (engine, services, deployment).
- **A2 How the maths works:** ETc = Kc × ET₀, soil-water balance, flow = η × P / (ρ g H), bucket-test calibration.
- **A3 Competitors:** BaKhabar Kissan, PCRWR advisory, Lorentz / Shakti monitoring, municipal flow meters (table in PRODUCT_ESSENTIALS.md).
- **A4 Privacy:** farmer-owned data; anonymised district-level view; blurred locations.
- **A5 Offline and alerts:** offline advice, pump-off alarm, SMS / WhatsApp option.
- **A6 Roadmap:** smart relay fitted by installers, local SMS provider, more crops, real drive integrations.
- **A7 The farmer interview:** what we learned (run-hours, "about double the water", installer / aarhti roles). Share only with permission.

## Delivery tips

- Rehearse out loud twice with a timer. Cut words, not the demo.
- Open the live site **before** you walk on stage. Have `docs/demo/paanipulse-demo.mp4` open in another window.
- Start with the farmer, not with the team. Say the team names on the last slide.
- Use the 20-litre bottle only as a prop and say clearly that the numbers are examples ([BUCKET_TEST.md](BUCKET_TEST.md)).
- For questions, use [MENTOR_PREP.md](MENTOR_PREP.md) section 3. Name your weaknesses before they do.

## Assets to drop into the slides

| Need | File |
|---|---|
| Phone screens | `docs/screenshots/home-ur.png`, `farmer-ur.png`, `chat-ur.png`, `alarm-ur.png`, `weather-en.png`, `output-en.png` |
| Authority and lender | `docs/screenshots/authority.png`, `installer.png`, `report.png` |
| QR code | `docs/qr/paanipulse-qr.png` (or `.svg` for crisp printing) |
| Video | `docs/demo/paanipulse-demo.mp4` |
