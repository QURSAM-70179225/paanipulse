/**
 * Spoken explanations for the farmer dashboard cards: one guided voice note per card that says what the card means
 * and what to do, for farmers who can't read. Written for the ear: round numbers, short sentences, the action last.
 *
 * Voices: Urdu (ur), English (en) and Punjabi (pa). Punjabi is spoken only, never shown, and is written in Gurmukhi
 * because that is the only script Azure's Punjabi voice (pa-IN) reads. The Roman versions are for phones with no
 * Urdu or Punjabi voice: an English-India voice reads them.
 */
import type { FarmState } from "./farmState";

export type VoiceLang = "ur" | "en" | "pa";
export const VOICE_LANGS: VoiceLang[] = ["ur", "en", "pa"];
export type VoiceScript = { ur: string; urRoman: string; en: string; pa: string; paRoman: string };
export type CardId = "report" | "advice" | "yesterday" | "today" | "output" | "week" | "spare" | "weather";

type Say = "ur" | "urRoman" | "en" | "pa" | "paRoman";

const hrs = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));

/** A quantity said the way a farmer would say it: 76,911 → "about 77 thousand" (or "lakh" from 100,000). */
export function spokenAmount(n: number, say: Say): string {
  const x = Math.max(0, n);
  const words = {
    ur: ["ہزار", "لاکھ"],
    urRoman: ["hazaar", "lakh"],
    en: ["thousand", "lakh"],
    pa: ["ਹਜ਼ਾਰ", "ਲੱਖ"],
    paRoman: ["hazaar", "lakh"],
  }[say];
  if (x < 1000) return `${Math.round(x)}`;
  if (x < 100_000 || say === "en") return `${Math.round(x / 1000).toLocaleString("en-US")} ${words[0]}`;
  const lakh = Math.round(x / 10_000) / 10;
  return `${Number.isInteger(lakh) ? lakh : lakh.toFixed(1)} ${words[1]}`;
}

const all = (f: (say: Say, A: (n: number) => string) => string): VoiceScript => ({
  ur: f("ur", (n) => spokenAmount(n, "ur")),
  urRoman: f("urRoman", (n) => spokenAmount(n, "urRoman")),
  en: f("en", (n) => spokenAmount(n, "en")),
  pa: f("pa", (n) => spokenAmount(n, "pa")),
  paRoman: f("paRoman", (n) => spokenAmount(n, "paRoman")),
});

const pick = (say: Say, o: Record<Say, string>) => o[say];

function advice(s: FarmState): VoiceScript {
  const a = s.today.advice;
  const h = hrs(a.hoursToday);
  const rest = a.kind === "irrigate" && a.totalHours > a.hoursToday;
  const next = a.daysUntilNext;
  const generated = all((say) => {
    if (a.kind === "irrigate") {
      return [
        pick(say, {
          ur: `آج پمپ ${h} گھنٹے چلائیں۔`,
          urRoman: `Aaj pump ${h} ghantay chalaayen.`,
          en: `Today, run the pump for ${h} hours.`,
          pa: `ਅੱਜ ਪੰਪ ${h} ਘੰਟੇ ਚਲਾਓ।`,
          paRoman: `Ajj pump ${h} ghante chalao.`,
        }),
        rest
          ? pick(say, {
              ur: "باقی پانی کل دیں۔",
              urRoman: "Baaqi paani kal den.",
              en: "Give the rest of the water tomorrow.",
              pa: "ਬਾਕੀ ਪਾਣੀ ਕੱਲ੍ਹ ਦਿਓ।",
              paRoman: "Baaki paani kall deo.",
            })
          : "",
        pick(say, {
          ur: "دھوپ کے وقت چلائیں، اور کھیت میں پانی کھڑا ہونے لگے تو پمپ بند کر دیں۔",
          urRoman: "Dhoop ke waqt chalaayen, aur khet mein paani khara honay lage to pump band kar den.",
          en: "Run it while the sun is strong, and switch it off if water starts standing in the field.",
          pa: "ਧੁੱਪ ਵੇਲੇ ਚਲਾਓ, ਤੇ ਜੇ ਖੇਤ ਵਿੱਚ ਪਾਣੀ ਖੜ੍ਹਨ ਲੱਗੇ ਤਾਂ ਪੰਪ ਬੰਦ ਕਰ ਦਿਓ।",
          paRoman: "Dhupp vele chalao, te je khet vich paani kharran lagge taan pump band kar deo.",
        }),
      ].filter(Boolean).join(" ");
    }
    const first =
      a.kind === "skip-rain"
        ? pick(say, {
            ur: "آج پمپ نہ چلائیں۔ کل بارش کا امکان ہے، بارش کا پانی فصل کے لیے کافی ہو گا۔",
            urRoman: "Aaj pump na chalaayen. Kal baarish ka imkaan hai, baarish ka paani fasal ke liye kaafi ho ga.",
            en: "Do not run the pump today. Rain is expected tomorrow, and it will be enough for the crop.",
            pa: "ਅੱਜ ਪੰਪ ਨਾ ਚਲਾਓ। ਕੱਲ੍ਹ ਮੀਂਹ ਪੈਣ ਦੀ ਉਮੀਦ ਹੈ, ਮੀਂਹ ਦਾ ਪਾਣੀ ਫ਼ਸਲ ਲਈ ਕਾਫ਼ੀ ਹੋਵੇਗਾ।",
            paRoman: "Ajj pump na chalao. Kall meenh pain di umeed ae, meenh da paani fasal layi kaafi howe ga.",
          })
        : pick(say, {
            ur: "آج پمپ بند رکھیں۔ زمین میں ابھی نمی ہے، فصل کو پانی کی ضرورت نہیں۔",
            urRoman: "Aaj pump band rakhen. Zameen mein abhi nami hai, fasal ko paani ki zaroorat nahin.",
            en: "Keep the pump off today. The soil is still moist, so the crop does not need water.",
            pa: "ਅੱਜ ਪੰਪ ਬੰਦ ਰੱਖੋ। ਜ਼ਮੀਨ ਵਿੱਚ ਹਾਲੇ ਨਮੀ ਹੈ, ਫ਼ਸਲ ਨੂੰ ਪਾਣੀ ਦੀ ਲੋੜ ਨਹੀਂ।",
            paRoman: "Ajj pump band rakkho. Zameen vich haale nami ae, fasal nu paani di lorr nahin.",
          });
    const when =
      next !== null
        ? pick(say, {
            ur: `اگلا پانی تقریباً ${next} دن بعد دینا ہو گا۔`,
            urRoman: `Agla paani taqreeban ${next} din baad dena ho ga.`,
            en: `The next watering is in about ${next} days.`,
            pa: `ਅਗਲਾ ਪਾਣੀ ਲਗਭਗ ${next} ਦਿਨਾਂ ਬਾਅਦ ਦੇਣਾ ਪਵੇਗਾ।`,
            paRoman: `Agla paani lagbhag ${next} dinaan baad dena pawe ga.`,
          })
        : "";
    return [first, when].filter(Boolean).join(" ");
  });
  // Urdu and English keep the engine's own daily advisory, the same words as the text and the daily voice note.
  return { ...generated, ur: s.advisory.textUrdu || generated.ur, urRoman: s.advisory.textRomanUrdu || generated.urRoman, en: s.advisory.textEnglish || generated.en };
}

function yesterday(s: FarmState): VoiceScript | null {
  const y = s.yesterday;
  if (!y || y.actualHours <= 0) return null;
  const a = hrs(y.actualHours);
  const n = hrs(y.neededHours);
  const over = y.neededHours <= 0 || y.actualHours > y.neededHours;
  return all((say, A) =>
    [
      pick(say, {
        ur: `کل آپ نے پمپ ${a} گھنٹے چلایا اور تقریباً ${A(y.pumpedM3 * 1000)} لیٹر پانی نکالا۔`,
        urRoman: `Kal aap ne pump ${a} ghantay chalaaya aur taqreeban ${A(y.pumpedM3 * 1000)} litre paani nikaala.`,
        en: `Yesterday you ran the pump for ${a} hours and pumped about ${A(y.pumpedM3 * 1000)} litres.`,
        pa: `ਕੱਲ੍ਹ ਤੁਸੀਂ ਪੰਪ ${a} ਘੰਟੇ ਚਲਾਇਆ ਤੇ ਲਗਭਗ ${A(y.pumpedM3 * 1000)} ਲੀਟਰ ਪਾਣੀ ਕੱਢਿਆ।`,
        paRoman: `Kall tusi pump ${a} ghante chalaaya te lagbhag ${A(y.pumpedM3 * 1000)} litre paani kaddhya.`,
      }),
      y.neededHours <= 0
        ? pick(say, {
            ur: "فصل کو کل پانی کی ضرورت نہیں تھی۔",
            urRoman: "Fasal ko kal paani ki zaroorat nahin thi.",
            en: "The crop did not need any water yesterday.",
            pa: "ਫ਼ਸਲ ਨੂੰ ਕੱਲ੍ਹ ਪਾਣੀ ਦੀ ਲੋੜ ਨਹੀਂ ਸੀ।",
            paRoman: "Fasal nu kall paani di lorr nahin si.",
          })
        : pick(say, {
            ur: `فصل کو صرف ${n} گھنٹے کی ضرورت تھی۔`,
            urRoman: `Fasal ko sirf ${n} ghantay ki zaroorat thi.`,
            en: `The crop needed only ${n} hours.`,
            pa: `ਫ਼ਸਲ ਨੂੰ ਸਿਰਫ਼ ${n} ਘੰਟਿਆਂ ਦੀ ਲੋੜ ਸੀ।`,
            paRoman: `Fasal nu sirf ${n} ghanteyaan di lorr si.`,
          }),
      over
        ? pick(say, {
            ur: "زیادہ پانی جڑوں سے نیچے ضائع ہو گیا اور ساتھ کھاد بھی بہہ گئی۔ آج مشورے کے مطابق ہی پمپ چلائیں۔",
            urRoman: "Zyada paani jaron se neeche zaaya ho gaya aur saath khaad bhi beh gayi. Aaj mashwaray ke mutaabiq hi pump chalaayen.",
            en: "The extra water went below the roots and washed fertiliser away. Today, run the pump only as advised.",
            pa: "ਵਾਧੂ ਪਾਣੀ ਜੜ੍ਹਾਂ ਤੋਂ ਹੇਠਾਂ ਬਰਬਾਦ ਹੋ ਗਿਆ ਤੇ ਨਾਲ ਖਾਦ ਵੀ ਰੁੜ੍ਹ ਗਈ। ਅੱਜ ਸਲਾਹ ਮੁਤਾਬਕ ਹੀ ਪੰਪ ਚਲਾਓ।",
            paRoman: "Vaadhu paani jarraan ton hethaan barbaad ho gaya te naal khaad vi rurr gayi. Ajj salaah mutaabik hi pump chalao.",
          })
        : pick(say, {
            ur: "بہت اچھا، آپ نے ضرورت کے مطابق پانی دیا۔",
            urRoman: "Bohat acha, aap ne zaroorat ke mutaabiq paani diya.",
            en: "Well done, you gave the crop what it needed.",
            pa: "ਸ਼ਾਬਾਸ਼, ਤੁਸੀਂ ਲੋੜ ਮੁਤਾਬਕ ਪਾਣੀ ਦਿੱਤਾ।",
            paRoman: "Shaabaash, tusi lorr mutaabik paani dittaa.",
          }),
    ].join(" "),
  );
}

function today(s: FarmState): VoiceScript {
  const t = s.today;
  const irrigate = t.advice.kind === "irrigate";
  const rain = (s.forecast[1]?.precipMm ?? 0) >= 2;
  const sun = t.pumpableHours;
  return all((say, A) =>
    [
      pick(say, {
        ur: `آج آپ کی فصل تقریباً ${A(t.cropUseM3 * 1000)} لیٹر پانی استعمال کرے گی۔`,
        urRoman: `Aaj aap ki fasal taqreeban ${A(t.cropUseM3 * 1000)} litre paani istemaal kare gi.`,
        en: `Today your crop will use about ${A(t.cropUseM3 * 1000)} litres of water.`,
        pa: `ਅੱਜ ਤੁਹਾਡੀ ਫ਼ਸਲ ਲਗਭਗ ${A(t.cropUseM3 * 1000)} ਲੀਟਰ ਪਾਣੀ ਵਰਤੇਗੀ।`,
        paRoman: `Ajj tuhaadi fasal lagbhag ${A(t.cropUseM3 * 1000)} litre paani vartegi.`,
      }),
      irrigate
        ? pick(say, {
            ur: "زمین خشک ہو رہی ہے۔",
            urRoman: "Zameen khushk ho rahi hai.",
            en: "The soil is drying out.",
            pa: "ਜ਼ਮੀਨ ਸੁੱਕ ਰਹੀ ਹੈ।",
            paRoman: "Zameen sukk rahi ae.",
          })
        : pick(say, {
            ur: "یہ پانی زمین کی نمی سے مل رہا ہے۔",
            urRoman: "Yeh paani zameen ki nami se mil raha hai.",
            en: "This water is coming from the moisture already in the soil.",
            pa: "ਇਹ ਪਾਣੀ ਜ਼ਮੀਨ ਦੀ ਨਮੀ ਤੋਂ ਮਿਲ ਰਿਹਾ ਹੈ।",
            paRoman: "Eh paani zameen di nami ton mil reha ae.",
          }),
      rain
        ? pick(say, {
            ur: "کل بارش کا امکان ہے۔",
            urRoman: "Kal baarish ka imkaan hai.",
            en: "Rain is likely tomorrow.",
            pa: "ਕੱਲ੍ਹ ਮੀਂਹ ਪੈਣ ਦੀ ਉਮੀਦ ਹੈ।",
            paRoman: "Kall meenh pain di umeed ae.",
          })
        : pick(say, {
            ur: "کل بارش نہیں ہو گی۔",
            urRoman: "Kal baarish nahin ho gi.",
            en: "No rain is expected tomorrow.",
            pa: "ਕੱਲ੍ਹ ਮੀਂਹ ਨਹੀਂ ਪਵੇਗਾ।",
            paRoman: "Kall meenh nahin pawe ga.",
          }),
      pick(say, {
        ur: `آپ کا پمپ ایک گھنٹے میں تقریباً ${A(t.flowRange.low * 1000)} سے ${A(t.flowRange.high * 1000)} لیٹر پانی نکالتا ہے۔`,
        urRoman: `Aap ka pump aik ghantay mein taqreeban ${A(t.flowRange.low * 1000)} se ${A(t.flowRange.high * 1000)} litre paani nikaalta hai.`,
        en: `Your pump gives about ${A(t.flowRange.low * 1000)} to ${A(t.flowRange.high * 1000)} litres in one hour.`,
        pa: `ਤੁਹਾਡਾ ਪੰਪ ਇੱਕ ਘੰਟੇ ਵਿੱਚ ਲਗਭਗ ${A(t.flowRange.low * 1000)} ਤੋਂ ${A(t.flowRange.high * 1000)} ਲੀਟਰ ਪਾਣੀ ਕੱਢਦਾ ਹੈ।`,
        paRoman: `Tuhaada pump ikk ghante vich lagbhag ${A(t.flowRange.low * 1000)} ton ${A(t.flowRange.high * 1000)} litre paani kaddhda ae.`,
      }),
      pick(say, {
        ur: `آج ${sun} گھنٹے اچھی دھوپ ہے۔`,
        urRoman: `Aaj ${sun} ghantay achi dhoop hai.`,
        en: `There are ${sun} hours of good sunshine today.`,
        pa: `ਅੱਜ ${sun} ਘੰਟੇ ਚੰਗੀ ਧੁੱਪ ਹੈ।`,
        paRoman: `Ajj ${sun} ghante changi dhupp ae.`,
      }),
      irrigate
        ? pick(say, {
            ur: "پمپ دھوپ کے انہی گھنٹوں میں چلائیں۔",
            urRoman: "Pump dhoop ke inhi ghanton mein chalaayen.",
            en: "Run the pump during these sunny hours.",
            pa: "ਪੰਪ ਧੁੱਪ ਦੇ ਇਨ੍ਹਾਂ ਘੰਟਿਆਂ ਵਿੱਚ ਹੀ ਚਲਾਓ।",
            paRoman: "Pump dhupp de inhaan ghanteyaan vich hi chalao.",
          })
        : pick(say, {
            ur: "آج پمپ چلانے کی ضرورت نہیں۔",
            urRoman: "Aaj pump chalaane ki zaroorat nahin.",
            en: "There is no need to run the pump today.",
            pa: "ਅੱਜ ਪੰਪ ਚਲਾਉਣ ਦੀ ਲੋੜ ਨਹੀਂ।",
            paRoman: "Ajj pump chalaun di lorr nahin.",
          }),
    ].join(" "),
  );
}

function output(s: FarmState): VoiceScript | null {
  const o = s.today.output;
  if (o.mid.litresPerMin <= 0) return null;
  const lpm = Math.round(o.mid.litresPerMin / 10) * 10;
  const kanal = o.mid.kanalPerHour.toFixed(1);
  const hpa = o.mid.hoursPerAcre ? o.mid.hoursPerAcre.toFixed(1) : null;
  return all((say) =>
    [
      pick(say, {
        ur: `دوپہر کی دھوپ میں آپ کا پمپ ایک منٹ میں تقریباً ${lpm} لیٹر پانی دیتا ہے۔`,
        urRoman: `Dopehar ki dhoop mein aap ka pump aik minute mein taqreeban ${lpm} litre paani deta hai.`,
        en: `In midday sun your pump gives about ${lpm} litres a minute.`,
        pa: `ਦੁਪਹਿਰ ਦੀ ਧੁੱਪ ਵਿੱਚ ਤੁਹਾਡਾ ਪੰਪ ਇੱਕ ਮਿੰਟ ਵਿੱਚ ਲਗਭਗ ${lpm} ਲੀਟਰ ਪਾਣੀ ਦਿੰਦਾ ਹੈ।`,
        paRoman: `Dupehar di dhupp vich tuhaada pump ikk minute vich lagbhag ${lpm} litre paani dinda ae.`,
      }),
      pick(say, {
        ur: `ایک گھنٹے میں تقریباً ${kanal} کنال زمین کو پانی لگ جاتا ہے۔`,
        urRoman: `Aik ghantay mein taqreeban ${kanal} kanaal zameen ko paani lag jaata hai.`,
        en: `In one hour it waters about ${kanal} kanal of land.`,
        pa: `ਇੱਕ ਘੰਟੇ ਵਿੱਚ ਲਗਭਗ ${kanal} ਕਨਾਲ ਜ਼ਮੀਨ ਨੂੰ ਪਾਣੀ ਲੱਗ ਜਾਂਦਾ ਹੈ।`,
        paRoman: `Ikk ghante vich lagbhag ${kanal} kanaal zameen nu paani lagg jaanda ae.`,
      }),
      hpa
        ? pick(say, {
            ur: `ایک ایکڑ کو پانی دینے میں تقریباً ${hpa} گھنٹے لگتے ہیں۔`,
            urRoman: `Aik acre ko paani denay mein taqreeban ${hpa} ghantay lagtay hain.`,
            en: `One acre takes about ${hpa} hours.`,
            pa: `ਇੱਕ ਏਕੜ ਨੂੰ ਪਾਣੀ ਦੇਣ ਵਿੱਚ ਲਗਭਗ ${hpa} ਘੰਟੇ ਲੱਗਦੇ ਹਨ।`,
            paRoman: `Ikk acre nu paani den vich lagbhag ${hpa} ghante lagde ne.`,
          })
        : "",
      s.pump.calibrated
        ? ""
        : pick(say, {
            ur: "یہ اندازہ ہے۔ بالٹی ٹیسٹ کر لیں تو حساب زیادہ ٹھیک ہو جائے گا۔",
            urRoman: "Yeh andaaza hai. Baalti test kar len to hisaab zyada theek ho jaaye ga.",
            en: "This is an estimate. Do the bucket test to make it more accurate.",
            pa: "ਇਹ ਅੰਦਾਜ਼ਾ ਹੈ। ਬਾਲਟੀ ਟੈਸਟ ਕਰ ਲਓ ਤਾਂ ਹਿਸਾਬ ਹੋਰ ਠੀਕ ਹੋ ਜਾਵੇਗਾ।",
            paRoman: "Eh andaaza ae. Baalti test kar lao taan hisaab hor theek ho jaawe ga.",
          }),
    ].filter(Boolean).join(" "),
  );
}

function week(s: FarmState): VoiceScript {
  const w = s.week;
  if (w.overNeedPct <= 5) {
    return all((say) =>
      pick(say, {
        ur: "پچھلے سات دنوں میں آپ نے ضرورت کے مطابق پانی دیا۔ شاباش، ایسے ہی جاری رکھیں۔",
        urRoman: "Pichlay saat dinon mein aap ne zaroorat ke mutaabiq paani diya. Shaabaash, aise hi jaari rakhen.",
        en: "In the last seven days you gave the crop the water it needed. Well done, keep it up.",
        pa: "ਪਿਛਲੇ ਸੱਤ ਦਿਨਾਂ ਵਿੱਚ ਤੁਸੀਂ ਲੋੜ ਮੁਤਾਬਕ ਪਾਣੀ ਦਿੱਤਾ। ਸ਼ਾਬਾਸ਼, ਇੰਜ ਹੀ ਕਰਦੇ ਰਹੋ।",
        paRoman: "Pichhle satt dinaan vich tusi lorr mutaabik paani dittaa. Shaabaash, inj hi karde raho.",
      }),
    );
  }
  const pct = Math.round(w.overNeedPct);
  const kg = Math.round(w.ureaKg);
  const earn = w.wastedKwh * s.surplusRsPerKwh;
  return all((say, A) =>
    [
      pick(say, {
        ur: `پچھلے سات دنوں میں آپ نے فصل کی ضرورت سے ${pct} فیصد زیادہ پانی دیا۔`,
        urRoman: `Pichlay saat dinon mein aap ne fasal ki zaroorat se ${pct} feesad zyada paani diya.`,
        en: `In the last seven days you gave ${pct} percent more water than the crop needed.`,
        pa: `ਪਿਛਲੇ ਸੱਤ ਦਿਨਾਂ ਵਿੱਚ ਤੁਸੀਂ ਫ਼ਸਲ ਦੀ ਲੋੜ ਤੋਂ ${pct} ਫ਼ੀਸਦੀ ਵੱਧ ਪਾਣੀ ਦਿੱਤਾ।`,
        paRoman: `Pichhle satt dinaan vich tusi fasal di lorr ton ${pct} feesadi vadh paani dittaa.`,
      }),
      pick(say, {
        ur: `تقریباً ${A(w.excessM3 * 1000)} لیٹر پانی جڑوں سے نیچے ضائع ہوا، اور ساتھ تقریباً ${kg} کلو یوریا بہہ گئی، جس کی قیمت تقریباً ${A(w.ureaRs)} روپے ہے۔`,
        urRoman: `Taqreeban ${A(w.excessM3 * 1000)} litre paani jaron se neeche zaaya hua, aur saath taqreeban ${kg} kilo urea beh gayi, jis ki qeemat taqreeban ${A(w.ureaRs)} rupay hai.`,
        en: `About ${A(w.excessM3 * 1000)} litres went below the roots, and about ${kg} kilos of urea washed away with it, worth about ${A(w.ureaRs)} rupees.`,
        pa: `ਲਗਭਗ ${A(w.excessM3 * 1000)} ਲੀਟਰ ਪਾਣੀ ਜੜ੍ਹਾਂ ਤੋਂ ਹੇਠਾਂ ਬਰਬਾਦ ਹੋਇਆ, ਤੇ ਨਾਲ ਲਗਭਗ ${kg} ਕਿੱਲੋ ਯੂਰੀਆ ਰੁੜ੍ਹ ਗਿਆ, ਜਿਸ ਦੀ ਕੀਮਤ ਲਗਭਗ ${A(w.ureaRs)} ਰੁਪਏ ਹੈ।`,
        paRoman: `Lagbhag ${A(w.excessM3 * 1000)} litre paani jarraan ton hethaan barbaad hoya, te naal lagbhag ${kg} killo urea rurr gaya, jis di keemat lagbhag ${A(w.ureaRs)} rupaye ae.`,
      }),
      pick(say, {
        ur: `یہ بجلی بچا کر آپ تقریباً ${A(earn)} روپے کما سکتے تھے۔ پمپ صرف مشورے کے مطابق چلائیں۔`,
        urRoman: `Yeh bijli bacha kar aap taqreeban ${A(earn)} rupay kama sakte thay. Pump sirf mashwaray ke mutaabiq chalaayen.`,
        en: `Saving that solar power could have earned you about ${A(earn)} rupees. Run the pump only as advised.`,
        pa: `ਇਹ ਬਿਜਲੀ ਬਚਾ ਕੇ ਤੁਸੀਂ ਲਗਭਗ ${A(earn)} ਰੁਪਏ ਕਮਾ ਸਕਦੇ ਸੀ। ਪੰਪ ਸਿਰਫ਼ ਸਲਾਹ ਮੁਤਾਬਕ ਚਲਾਓ।`,
        paRoman: `Eh bijli bacha ke tusi lagbhag ${A(earn)} rupaye kama sakde si. Pump sirf salaah mutaabik chalao.`,
      }),
    ].join(" "),
  );
}

function spare(s: FarmState): VoiceScript {
  const kwh = Math.round(s.today.todaySpareKwh);
  const ideas = s.today.todaySpareIdeas;
  const best = Math.max(0, ...ideas.map((i) => i.rs));
  const listUr = ideas.map((i) => `${i.labelUr} سے ${spokenAmount(i.rs, "ur")} روپے`).join("، ");
  const listEn = ideas.map((i) => `${i.labelEn}: ${spokenAmount(i.rs, "en")} rupees`).join("; ");
  return all((say, A) =>
    [
      pick(say, {
        ur: `آج پانی کے بعد بھی تقریباً ${kwh} یونٹ سولر بجلی فالتو ہو گی۔`,
        urRoman: `Aaj paani ke baad bhi taqreeban ${kwh} unit solar bijli faaltu ho gi.`,
        en: `Today about ${kwh} units of solar power will be spare after watering.`,
        pa: `ਅੱਜ ਪਾਣੀ ਤੋਂ ਬਾਅਦ ਵੀ ਲਗਭਗ ${kwh} ਯੂਨਿਟ ਸੋਲਰ ਬਿਜਲੀ ਵਾਧੂ ਹੋਵੇਗੀ।`,
        paRoman: `Ajj paani ton baad vi lagbhag ${kwh} unit solar bijli vaadhu howe gi.`,
      }),
      pick(say, {
        ur: listUr ? `اس سے کمائی ہو سکتی ہے: ${listUr}۔` : "",
        urRoman: `Is se taqreeban ${A(best)} rupay tak kamaai ho sakti hai, jaise battery charge kar ke.`,
        en: listEn ? `You could earn from it: ${listEn}.` : "",
        pa: `ਇਸ ਨਾਲ ਲਗਭਗ ${A(best)} ਰੁਪਏ ਤੱਕ ਕਮਾਈ ਹੋ ਸਕਦੀ ਹੈ, ਜਿਵੇਂ ਬੈਟਰੀਆਂ ਚਾਰਜ ਕਰਕੇ।`,
        paRoman: `Is naal lagbhag ${A(best)} rupaye tak kamaai ho sakdi ae, jiwen batteriyaan charge kar ke.`,
      }),
      pick(say, {
        ur: "یہ اندازے ہیں۔",
        urRoman: "Yeh andaazay hain.",
        en: "These are estimates.",
        pa: "ਇਹ ਅੰਦਾਜ਼ੇ ਹਨ।",
        paRoman: "Eh andaaze ne.",
      }),
    ].filter(Boolean).join(" "),
  );
}

function weather(s: FarmState): VoiceScript {
  const now = s.weatherNow?.tempC;
  const max = s.forecast[0]?.tMax;
  const rainIdx = s.forecast.findIndex((d) => d.precipMm >= 1);
  return all((say) => {
    const parts: string[] = [];
    if (now != null) {
      const t = Math.round(now);
      parts.push(pick(say, {
        ur: `ابھی درجہ حرارت ${t} ڈگری ہے۔`,
        urRoman: `Abhi darja-e-hararat ${t} degree hai.`,
        en: `It is ${t} degrees now.`,
        pa: `ਹੁਣ ਤਾਪਮਾਨ ${t} ਡਿਗਰੀ ਹੈ।`,
        paRoman: `Hun taapmaan ${t} degree ae.`,
      }));
    }
    if (max != null) {
      const t = Math.round(max);
      parts.push(pick(say, {
        ur: `آج زیادہ سے زیادہ ${t} ڈگری ہو گا۔`,
        urRoman: `Aaj zyada se zyada ${t} degree ho ga.`,
        en: `Today's high is ${t} degrees.`,
        pa: `ਅੱਜ ਵੱਧ ਤੋਂ ਵੱਧ ${t} ਡਿਗਰੀ ਹੋਵੇਗਾ।`,
        paRoman: `Ajj vadh ton vadh ${t} degree howe ga.`,
      }));
    }
    if (rainIdx < 0) {
      parts.push(pick(say, {
        ur: "اگلے سات دنوں میں بارش کا امکان نہیں۔",
        urRoman: "Aglay saat dinon mein baarish ka imkaan nahin.",
        en: "No rain is expected in the next seven days.",
        pa: "ਅਗਲੇ ਸੱਤ ਦਿਨਾਂ ਵਿੱਚ ਮੀਂਹ ਦੀ ਉਮੀਦ ਨਹੀਂ।",
        paRoman: "Agle satt dinaan vich meenh di umeed nahin.",
      }));
    } else if (rainIdx === 0) {
      parts.push(pick(say, {
        ur: "آج بارش کا امکان ہے۔",
        urRoman: "Aaj baarish ka imkaan hai.",
        en: "Rain is expected today.",
        pa: "ਅੱਜ ਮੀਂਹ ਪੈਣ ਦੀ ਉਮੀਦ ਹੈ।",
        paRoman: "Ajj meenh pain di umeed ae.",
      }));
    } else if (rainIdx === 1) {
      parts.push(pick(say, {
        ur: "کل بارش کا امکان ہے۔",
        urRoman: "Kal baarish ka imkaan hai.",
        en: "Rain is expected tomorrow.",
        pa: "ਕੱਲ੍ਹ ਮੀਂਹ ਪੈਣ ਦੀ ਉਮੀਦ ਹੈ।",
        paRoman: "Kall meenh pain di umeed ae.",
      }));
    } else {
      parts.push(pick(say, {
        ur: `اگلی بارش ${rainIdx} دن بعد متوقع ہے۔`,
        urRoman: `Agli baarish ${rainIdx} din baad mutawaqqa hai.`,
        en: `The next rain is expected in ${rainIdx} days.`,
        pa: `ਅਗਲਾ ਮੀਂਹ ${rainIdx} ਦਿਨਾਂ ਬਾਅਦ ਪੈਣ ਦੀ ਉਮੀਦ ਹੈ।`,
        paRoman: `Agla meenh ${rainIdx} dinaan baad pain di umeed ae.`,
      }));
    }
    return parts.join(" ");
  });
}

/** The "how many hours did the pump run yesterday?" question: asks it and says which buttons to press. */
const REPORT: VoiceScript = {
  ur: "کل آپ نے پمپ کتنے گھنٹے چلایا؟ نیچے گھنٹوں والا نمبر دبائیں: صفر، دو، چار، چھ یا آٹھ۔ اگر پمپ بالکل نہیں چلا تو صفر دبائیں۔ اس سے آپ کا پانی میٹر اور مشورہ درست رہتا ہے۔",
  urRoman: "Kal aap ne pump kitne ghantay chalaaya? Neeche ghanton waala number dabaayen: sifar, do, chaar, chhe ya aath. Agar pump bilkul nahin chala to sifar dabaayen. Is se aap ka paani meter aur mashwara durust rehta hai.",
  en: "How many hours did you run the pump yesterday? Press the number of hours below: zero, two, four, six or eight. If the pump did not run at all, press zero. This keeps your water meter and advice correct.",
  pa: "ਕੱਲ੍ਹ ਤੁਸੀਂ ਪੰਪ ਕਿੰਨੇ ਘੰਟੇ ਚਲਾਇਆ? ਹੇਠਾਂ ਘੰਟਿਆਂ ਵਾਲਾ ਨੰਬਰ ਦਬਾਓ: ਸਿਫ਼ਰ, ਦੋ, ਚਾਰ, ਛੇ ਜਾਂ ਅੱਠ। ਜੇ ਪੰਪ ਬਿਲਕੁਲ ਨਹੀਂ ਚੱਲਿਆ ਤਾਂ ਸਿਫ਼ਰ ਦਬਾਓ। ਇਸ ਨਾਲ ਤੁਹਾਡਾ ਪਾਣੀ ਮੀਟਰ ਤੇ ਸਲਾਹ ਠੀਕ ਰਹਿੰਦੀ ਹੈ।",
  paRoman: "Kall tusi pump kinne ghante chalaaya? Hethaan ghanteyaan waala number dabao: sifar, do, chaar, chhe ya aath. Je pump bilkul nahin chalya taan sifar dabao. Is naal tuhaada paani meter te salaah theek rehndi ae.",
};

/** One guided voice note per dashboard card (null where the card isn't shown). */
export function cardScripts(s: FarmState): Record<CardId, VoiceScript | null> {
  return {
    report: REPORT,
    advice: advice(s),
    yesterday: yesterday(s),
    today: today(s),
    output: output(s),
    week: week(s),
    spare: spare(s),
    weather: weather(s),
  };
}

/** Spoken when the farmer picks a voice language, so they hear the choice worked. */
export const VOICE_PICKED: VoiceScript = {
  ur: "اب میں اردو میں بولوں گا۔ ہر کارڈ پر سنیں کا بٹن دبائیں۔",
  urRoman: "Ab main Urdu mein bolun ga. Har card par sunein ka button dabaayen.",
  en: "I will speak English now. Press the listen button on any card.",
  pa: "ਹੁਣ ਮੈਂ ਪੰਜਾਬੀ ਵਿੱਚ ਬੋਲਾਂਗਾ। ਹਰ ਕਾਰਡ ਉੱਤੇ ਸੁਣੋ ਵਾਲਾ ਬਟਨ ਦਬਾਓ।",
  paRoman: "Hun main Punjabi vich bolaan ga. Har card utte suno waala button dabao.",
};
