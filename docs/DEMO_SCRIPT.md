# 3-minute demo script

**Before going on stage**

- Run `npm run demo:reset` (or redeploy on an empty database) so the demo farm is in its clean state.
- Open the site once (free Render plan sleeps) and check `/api/health?full=1`.
- Tabs ready: the farmer dashboard (Urdu), the authority dashboard (English). A terminal with `npm run simulate`.
- Charge a phone with the app installed and a recorded voice note as a backup.
- A recorded version of this flow is saved at `docs/demo/paanipulse-demo.mp4` (keep a copy on the laptop as a backup).
- More guidance for mentor sessions: [MENTOR_PREP.md](MENTOR_PREP.md).

Numbers below were measured with the offline sample weather; with live weather they will differ, so **read them off
the screen** rather than memorising them.

| Time | Show | Say |
|---|---|---|
| 0:00 | Home page | "About 650,000 solar tube wells. Solar made pumping free, so farmers pump all day. Nobody measures it." |
| 0:20 | Tap **Farmer (Karamat)** | "Karamat has 12.5 acres of wheat. Yesterday he ran the pump 6 hours; the crop needed none." |
| 0:35 | Advice card, play voice note | "Every morning he gets this in Urdu: *aaj pump band rakhein*." |
| 0:50 | Weekly waste card and chart | "He pumped about 84% more than the crop needed: litres lost, urea washed away, solar energy wasted." |
| 1:05 | Start `npm run simulate`; live meter | "No flow meter. The litres are computed from the solar drive's power readings." |
| 1:20 | Pump output card; bucket test | "About this many litres a minute. One 200-litre drum test calibrates the meter to this pump." |
| 1:40 | Chat: "kal barish hogi?" (tap or mic) | "The AI only phrases numbers our engine computed; any invented number is blocked." |
| 2:00 | Spare sunshine card | "On a pump-off day the spare solar is worth about a thousand rupees in battery charging." |
| 2:15 | Authority dashboard, filter a district, Export CSV | "For the Irrigation Department and lenders: anonymised district data. This is simulated demo data." |
| 2:45 | Close | "Solar made pumping free. PaaniPulse makes it smart." |

**Be ready for**

1. *"How is this different from ChatGPT?"* The numbers come from tested FAO-56 and pump-physics code; the AI only phrases them and is blocked if it invents one.
2. *"How do you get your first 100 users?"* Installers register farmers at the point of sale; aarhtis and input dealers keep them engaged.
3. *"What if your core assumption breaks?"* The meter shows ranges and calibrates with a bucket test; the pilot's field checks measure the error.
4. *"Is the data real?"* The 150 regional wells are simulated and labelled. The farmer story comes from a real interview. No pilot has run yet.
