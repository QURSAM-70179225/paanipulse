# Mentor session prep

Keep this open on a laptop. Three pitch lengths, a demo you can hand to a mentor, what to ask, how to answer hard
questions, and what to do when something breaks.

## 1. Three pitches

**30 seconds**
> Pakistan has about 650,000 solar tube wells (an estimate). Solar made pumping free, so farmers pump all day and nobody
> measures it. PaaniPulse is a virtual water meter with no hardware: each morning it tells the farmer, in an Urdu voice
> note, whether to run the pump or keep it off, and shows the fertiliser and solar energy saved. The Irrigation
> Department gets an anonymised map. It works today as a deployed prototype; our next step is validating the meter on a
> real pump.

**2 minutes** (problem → solution → proof → ask)
1. **Problem.** Solar pumping is free at the margin, so over-pumping is the default. A peer-reviewed study found solar
   farms pumped more than diesel farms in 77% of 30 matched pairs. One farmer told us he deepened his bore from about
   120 ft to 180–200 ft (roughly Rs 1.5–2 lakh).
2. **Solution.** Measure (virtual meter from pump specs and sunlight, calibrated by a 5-minute bucket test) → Advise (FAO-56
   crop water + soil balance, Urdu voice note, chat) → Earn (saved fertiliser, spare solar energy) → Map (anonymised
   district data for authorities and lenders).
3. **Proof.** Working, deployed, three user roles, tested engine, works offline, pump-off alarm. All numbers come from code;
   the AI only phrases them and is blocked from inventing any.
4. **Honest gap.** No pilot yet, meter not yet compared with a real flow measurement, regional data simulated.
5. **Ask.** An introduction to a solar installer or a pump where we can do a 20-minute drum test.

**5 minutes: the mentor walkthrough** (hand them the phone)
| Step | Do | Say |
|---|---|---|
| 1 | Open the live site → tap **Farmer (Karamat)** | "This is a real deployment; the demo farm is modelled on a farmer interview." |
| 2 | Read the top card; tap ▶ | "Yesterday he ran 6 hours, the crop needed none, so today: keep the pump off." |
| 3 | Scroll: waste, pump output, weather | "Water lost below the roots, urea washed away, solar energy wasted, and what it could have earned." |
| 4 | Start the **pump timer** (1 h) or show the alarm screen | "A loud alarm when it's time to switch off; works with no internet." |
| 5 | Open the chat; ask *kal barish hogi?* or use 🎤 | "The AI only phrases numbers our engine returns." |
| 6 | Sign out → **Irrigation Dept** | "Anonymised heatmap, MWh wasted, CSV export. This regional data is simulated." |
| 7 | Open `/about` | "Every formula, default and limitation is written down." |

## 2. What to ask mentors

- **Customers:** "Which solar installers, aarhtis or lenders would you introduce us to for a 15-minute call?"
- **Validation:** "Do you know someone with a solar tube well where we can do a drum test?"
- **Energy angle (OGDCL / energy mentors):** "How would a utility or lender value verified solar-pump usage data?"
- **Agronomy:** "Is the wheat first watering at 20–25 days after sowing right for Sheikhupura / Narowal?"
- **Pitch:** "If you remember one thing from the demo, what should it be?"

## 3. Hard questions and short answers

| Question | Answer |
|---|---|
| How is this different from ChatGPT? | Tested FAO-56 and pump-physics code computes the numbers for this farm; the AI only phrases them, and answers with an unreturned number are blocked. |
| Is the virtual meter accurate? | It's an estimate shown as a range; the bucket test calibrates it. We have not yet compared it to a real meter; the in-app field check is built for that. |
| Who pays? | Hypotheses: installers (after-sales service), then lenders, then the Irrigation Department. No one has committed yet. |
| What if the farmer ignores it? | The app can warn (alarm, SMS) but cannot switch the motor off. A smart relay fitted by the installer is the next product step. |
| Won't farmers fear a water tax? | Farmer-owned data; authorities see only anonymised, consented, district-level data; farmer messaging is about fertiliser and earning. |
| What's actually real? | The software, the maths, accounts and access control, weather. Simulated: the 150 regional wells, the demo farm's drive data. Unmeasured: field accuracy and behaviour change. |
| Why Urdu voice? | Low literacy and WhatsApp voice notes are how farmers already communicate; in our interview they said they would listen to a short Urdu voice note. |
| What does the AI cost / can it run offline? | Free-tier model today with a rule-based fallback giving the same numbers; the offline page shows the last advice with no internet. |

## 4. Readiness checklist

**Tonight**
- [ ] `https://paanipulse.onrender.com/api/health?full=1` → `"ok": true`, 3 demo accounts, weather source `live` or `openweather`
- [ ] Demo buttons work for all three roles; chat answers; microphone permission works on your phone
- [ ] GitHub variable `KEEP_WARM` = `true` (stops the free server sleeping)
- [ ] Recorded Urdu voice note saved as `public/audio/advisory-karamat.mp3` (so ▶ works on any phone)
- [ ] App installed on your phone; check it opens with Wi-Fi off
- [ ] Phone charged, power bank, hotspot data, printed QR cards (`docs/qr/`)
- [ ] Video on the laptop (`docs/demo/paanipulse-demo.mp4`) and slides saved as PDF

**Morning of**
- [ ] Open the site once; run `npm run weather:prime` from a laptop on normal internet (safety net for weather)
- [ ] Re-read section 3; pick the one story you will tell

**If something breaks**
| Problem | Do this |
|---|---|
| Site slow / asleep | Open it, wait up to a minute; meanwhile play the video |
| No Wi-Fi | Phone hotspot; or play the video; or show the offline page (last advice) |
| Weather says "Sample" | Say so; the app works. Run `weather:prime` or check `/api/health?full=1` |
| Chat slow or generic | Free AI limits: wait, or show the rule-based answer; the numbers are the same |
| Voice ▶ silent | Use the recorded mp3, or read the Urdu text aloud |
| Alarm silent | Tap **Start pump timer** once (browsers need a tap before sound); raise volume |
