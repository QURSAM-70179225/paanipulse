# Crop varieties and ripening time

Rice, wheat and the other crops each have many varieties. The farm form now asks for the **variety** (the seed name the farmer
knows) and the **ripening time**.

## What the farmer or installer sees

In the farm form (farmer set-up and installer registration), after the crop and sowing date:

1. **Variety (seed name):** a short list for the chosen crop, plus **"I don't know"** and **"Other (type the name)"** for a name
   from the seed bag. The list changes when the crop changes.
2. **How long does it take to ripen?** *Normal / I don't know*, *Early (shorter)* or *Late (longer)*.

The variety is then shown next to the crop on the farmer's page, the farmer's farm list and the installer's table
(for example "Rice (Basmati-515)").

## What changes the water calculation, and what does not

| Setting | Effect on the maths |
|---|---|
| **Variety name** | **None.** It is recorded for the installer, the extension officer and the pilot. |
| **Ripening time** | **Early** shrinks the four growth stages by 10%, **late** stretches them by 10%; **normal / I don't know** leaves the crop exactly as before. This moves the crop coefficient, the stage and the root depth. |

**Why the name does not change the maths.** We looked for an official, consolidated table of growth duration per variety and
**did not find one**. The sources we found give sowing windows and yields for wheat, and only a few trial maturity figures (for
example, one report puts a newer basmati line about 12 days earlier than Basmati-515, and one trial puts Faisalabad-2008 at about
154 days to maturity). Those are single trials, not release specifications. We will not invent a number per variety.

**The 10% is a rough assumption.** It is about 12 days on a 120-day crop, the size of the differences in the trials above. Confirm it
with an extension officer or the research institute. The critical-stage rule (for example, wheat crown-root stage 20–25 days after
sowing) is **not** shifted by the ripening time.

Existing farms are unchanged: they were all "normal".

## The variety lists

A starting list of names found in Punjab Agriculture Department, Agriculture Research Institute (AARI) and Punjab Seed Council
material. **It is not complete and not a recommendation.** Farmers can always choose "Other" and type the name.

| Crop | Offered |
|---|---|
| Wheat | Akbar-2019, Anaj-2017, Dilkash-2020, Subhani-2021, Galaxy-2013, Faisalabad-2008, Arooj-2022, MH-2021 |
| Rice | Super Basmati, Basmati-515, Basmati-385, KSK-133, KS-282, IRRI-6, NIAB IRRI-9, PK-386 |
| Maize | FH-1046, FH-949, FH-810, YH-1898, YH-5482, YH-5568 |
| Cotton | FH-416, CEMB-AAS-3, Nibji-19 |
| Sugarcane | CPF-246, CPF-247, CPF-248 |

Not every name was confirmed in the sources we could read (for example, Basmati-385 and PK-386 are listed from general knowledge,
and we found no maturity data for them). **Please have an extension officer review and extend this list**; it lives in one place,
`lib/engine/varieties.ts`.

Sources: [Punjab wheat variety table (AgriPunjab)](https://agripunjab.punjab.gov.pk/node/9618),
[AARI annual report 2022-23](https://aari.punjab.gov.pk/system/files/Annual%20Report%202022-23.pdf),
[Punjab Seed Council approvals](https://propakistani.pk/2023/03/25/punjab-seed-council-approves-dozens-of-new-varieties-of-seeds-for-cultivation/),
[PARC maize hybrids](https://thenews.com.pk/print/508850-parc-approves-33-varieties-of-hybrid-maize-for-farming),
[rice transplanting dates](https://agris.fao.org/search/en/records/6473b0cc13d110e4e7a9911f).

## Safety of the typed name

A typed variety is kept only if it is 1–40 characters of letters, digits, spaces, hyphens, dots or slashes, starting with a letter or
digit. Anything else is stored as "not given", so it cannot carry markup or odd characters into pages.

## Next steps

- Review the lists with an extension officer.
- Replace the 10% shift with real per-variety durations when an official source is found, then let the variety choose the ripening
  time automatically.
- Consider rice type (basmati versus coarse) separately, since transplanting dates and durations differ.

## Where the code is

| | |
|---|---|
| Lists, ripening scale, name cleaning | `lib/engine/varieties.ts` |
| Stage scaling | `kcForDay`, `stageForDay`, `rootDepthM` (new `stageScale` argument) and `simulateFarm` |
| Fields | `Farm.variety`, `Farm.maturity` (migration `crop_variety`) |
| Form | `components/onboard/OnboardWizard.tsx` |
| Tests | `tests/varieties.test.ts` |
