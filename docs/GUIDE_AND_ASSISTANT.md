# How-to guide (voice note) and assistant scope

## What was added

1. **Voice guide.** A one-minute voice note that explains the whole farm page: today's advice, the confidence line, the pump timer and alarm, reporting yesterday's hours, weather, the 7-day chart, fertiliser, soil probe, pump control, several farms, and the assistant. It ends with: the app advises, the decision is always the farmer's.
2. **Where the farmer finds it.**
   - A dismissible card at the top of the farm page ("New here? Listen to how to use the app"). Hiding it is remembered on that phone only.
   - A "How to use" button in the farm header.
   - A public page, `/guide`, with the voice note and a short written explanation of every feature in Urdu or English.
3. **Assistant answers about the app.** Before, the assistant refused anything that was not pump, water, weather, solar or fertiliser. Now it also answers how to use every feature (probe, SIM devices, SMS alert, pump control, several farms, bucket test, water chart, set-up, offline use). Other topics (cricket, politics, loans) are still refused, with the new sentence: "Sorry, I can only help with your pump, water, weather, solar and how to use this app." (Roman Urdu and Urdu versions in `app/api/chat/route.ts`.)
4. A chat chip "How do I use this app?".

## How it works

- All guide text lives in `lib/services/appGuide.ts`, in Urdu, Roman Urdu and English. One entry per feature, plus the full voice script.
- The assistant has a new tool `getAppGuide(topic?)`. It returns the guide text for one feature, or the overview. The model must use only that text, so the feature descriptions cannot drift from the app.
- When the AI is unavailable (no key, rate limit, ungrounded numbers) the offline answerer recognises how-to questions in English, Roman Urdu and Urdu and answers from the same text. A question like "kal barish hogi?" is still a data question, not a guide question.
- Numbers in guide text (for example "10 farms", "7 days") are in the tool output, so the existing number guardrail accepts them.

## The voice

| Language | Order tried |
| --- | --- |
| Urdu | neural voice (`/api/tts`, only if Azure is configured) → `public/audio/guide-ur.mp3` if present → the phone's browser voice (Urdu voice if installed, otherwise Roman Urdu with an English-India voice) → "read the text" message |
| English | `public/audio/guide-en.mp3` if present → the phone's English voice |

**Honest limits.** No Azure key is set on the live site and no mp3 is in the repo, so today the Urdu voice is the phone's own browser voice. On many Android phones there is no Urdu voice, so it reads the Roman Urdu text in an Indian-English voice, which sounds odd. The fix is one file: record the Urdu script in `lib/services/appGuide.ts` (`GUIDE_VOICE.ur`, about a minute) in a real voice and save it as `public/audio/guide-ur.mp3` (and `guide-en.mp3` for English). The player uses it automatically. A real voice is better than a synthetic one for farmers.

## Keep it true

If a feature changes, update its entry in `appGuide.ts` and the voice script, and re-record the mp3. `tests/appGuide.test.ts` checks that every topic has all three languages, that the Urdu script fits the neural voice limit (1,500 characters), and that how-to questions are routed to the guide.

## Tested

- Unit tests: guide content, topic matching in three languages, intent routing, the tool.
- Local browser: farm page shows the card; `/guide` renders all 16 sections; chat answers how-to questions in the offline fallback and with the AI; cricket questions are refused in English and Urdu with the AI.
- Not tested: playing the voice on a real phone (no audio device in the test environment), and the Urdu browser voice.
