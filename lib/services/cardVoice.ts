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
export type CardId =
  | "report" | "advice" | "yesterday" | "today" | "output" | "week" | "spare" | "weather"
  | "pumpctl" | "pumpbox" | "timer" | "live" | "probe" | "soil" | "chart" | "fertiliser" | "bucket" | "fieldcheck" | "location" | "awareness";

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

/* Device and tool cards: the same words for every farm, saying what the card is for and what to do. */
const PUMPCTL: VoiceScript = {
  "ur": "اس کارڈ سے آپ کہیں بھی بیٹھ کر موٹر چلا اور بند کر سکتے ہیں۔ گھنٹے چنیں اور پمپ شروع کریں دبائیں۔ وقت پورا ہوتے ہی موٹر خود بند ہو جائے گی۔ اگر مٹی کا پروب لگا ہے تو کھیت میں نمی پوری ہونے پر بھی موٹر خود بند ہو جائے گی۔ فوراً بند کرنا ہو تو لال بٹن دبائیں۔",
  "urRoman": "Is card se aap kahin bhi baith kar motor chala aur band kar sakte hain. Ghantay chunein aur pump shuru karein dabaayen. Waqt poora hotay hi motor khud band ho jaaye gi. Agar mitti ka probe laga hai to khet mein nami poori honay par bhi motor khud band ho jaaye gi. Foran band karna ho to laal button dabaayen.",
  "en": "From this card you can switch the motor on and off from anywhere. Choose the hours and press Start pump. The motor stops by itself when the time is up. If a soil probe is fitted, it also stops by itself when the field has enough water. To stop it at once, press the red button.",
  "pa": "ਇਸ ਕਾਰਡ ਨਾਲ ਤੁਸੀਂ ਕਿਤੇ ਵੀ ਬੈਠ ਕੇ ਮੋਟਰ ਚਲਾ ਤੇ ਬੰਦ ਕਰ ਸਕਦੇ ਹੋ। ਘੰਟੇ ਚੁਣੋ ਤੇ ਪੰਪ ਸ਼ੁਰੂ ਕਰੋ ਦਬਾਓ। ਸਮਾਂ ਪੂਰਾ ਹੁੰਦੇ ਹੀ ਮੋਟਰ ਆਪੇ ਬੰਦ ਹੋ ਜਾਵੇਗੀ। ਜੇ ਮਿੱਟੀ ਦਾ ਪ੍ਰੋਬ ਲੱਗਿਆ ਹੈ ਤਾਂ ਖੇਤ ਵਿੱਚ ਨਮੀ ਪੂਰੀ ਹੋਣ ਤੇ ਵੀ ਮੋਟਰ ਆਪੇ ਬੰਦ ਹੋ ਜਾਵੇਗੀ। ਹੁਣੇ ਬੰਦ ਕਰਨੀ ਹੋਵੇ ਤਾਂ ਲਾਲ ਬਟਨ ਦਬਾਓ।",
  "paRoman": "Is card naal tusi kite vi baith ke motor chala te band kar sakde ho. Ghante chuno te pump shuru karo dabao. Samaan poora hunde hi motor aape band ho jaawe gi. Je mitti da probe laggya ae taan khet vich nami poori hon te vi motor aape band ho jaawe gi. Hune band karni howe taan laal button dabao."
};

const PUMPBOX: VoiceScript = {
  "ur": "پمپ کنٹرول بکس الیکٹریشن موٹر پر لگاتا ہے۔ اس میں اپنی SIM ہوتی ہے۔ بکس پر لکھا کوڈ یہاں ایک بار لکھیں اور جوڑیں دبائیں۔ اس کے بعد آپ فون سے کہیں سے بھی موٹر چلا اور بند کر سکتے ہیں۔",
  "urRoman": "Pump control box electrician motor par lagaata hai. Is mein apni SIM hoti hai. Box par likha code yahan aik baar likhein aur jorein dabaayen. Is ke baad aap phone se kahin se bhi motor chala aur band kar sakte hain.",
  "en": "An electrician fits the pump control box at the motor. It has its own SIM. Type the code printed on the box here, once, and press Link. After that you can switch the motor on and off from your phone, from anywhere.",
  "pa": "ਪੰਪ ਕੰਟਰੋਲ ਬਕਸਾ ਬਿਜਲੀ ਵਾਲਾ ਮੋਟਰ ਉੱਤੇ ਲਾਉਂਦਾ ਹੈ। ਇਸ ਵਿੱਚ ਆਪਣੀ SIM ਹੁੰਦੀ ਹੈ। ਬਕਸੇ ਉੱਤੇ ਲਿਖਿਆ ਕੋਡ ਇੱਥੇ ਇੱਕ ਵਾਰ ਲਿਖੋ ਤੇ ਜੋੜੋ ਦਬਾਓ। ਫੇਰ ਤੁਸੀਂ ਫ਼ੋਨ ਨਾਲ ਕਿਤੋਂ ਵੀ ਮੋਟਰ ਚਲਾ ਤੇ ਬੰਦ ਕਰ ਸਕਦੇ ਹੋ।",
  "paRoman": "Pump control baksa bijli waala motor utte launda ae. Is vich apni SIM hundi ae. Bakse utte likhya code ithe ikk vaar likho te jorro dabao. Pher tusi phone naal kiton vi motor chala te band kar sakde ho."
};

const TIMER: VoiceScript = {
  "ur": "جب آپ خود پمپ چلائیں تو یہاں گھنٹے چن کر ٹائمر شروع کریں۔ وقت پورا ہونے پر فون زور سے بجے گا تاکہ آپ پمپ بند کر دیں۔ یہ انٹرنیٹ کے بغیر بھی چلتا ہے۔ موٹر خود بند کروانی ہو تو پمپ کنٹرول بکس لگوائیں۔",
  "urRoman": "Jab aap khud pump chalaayen to yahan ghantay chun kar timer shuru karein. Waqt poora honay par phone zor se bajay ga taa ke aap pump band kar den. Yeh internet ke baghair bhi chalta hai. Motor khud band karwaani ho to pump control box lagwaayen.",
  "en": "When you switch the pump on yourself, choose the hours here and start the timer. When the time is up, the phone rings loudly so you can switch the pump off. It works without internet. To have the motor stop by itself, get a pump control box fitted.",
  "pa": "ਜਦੋਂ ਤੁਸੀਂ ਆਪ ਪੰਪ ਚਲਾਓ ਤਾਂ ਇੱਥੇ ਘੰਟੇ ਚੁਣ ਕੇ ਟਾਈਮਰ ਸ਼ੁਰੂ ਕਰੋ। ਸਮਾਂ ਪੂਰਾ ਹੋਣ ਤੇ ਫ਼ੋਨ ਜ਼ੋਰ ਨਾਲ ਵੱਜੇਗਾ ਤਾਂ ਜੋ ਤੁਸੀਂ ਪੰਪ ਬੰਦ ਕਰ ਦਿਓ। ਇਹ ਇੰਟਰਨੈੱਟ ਤੋਂ ਬਿਨਾਂ ਵੀ ਚੱਲਦਾ ਹੈ। ਮੋਟਰ ਆਪੇ ਬੰਦ ਕਰਵਾਉਣੀ ਹੋਵੇ ਤਾਂ ਪੰਪ ਕੰਟਰੋਲ ਬਕਸਾ ਲਵਾਓ।",
  "paRoman": "Jadon tusi aap pump chalao taan ithe ghante chun ke timer shuru karo. Samaan poora hon te phone zor naal vajje ga taan jo tusi pump band kar deo. Eh internet ton binaan vi chalda ae. Motor aape band karwauni howe taan pump control baksa lawao."
};

const LIVE: VoiceScript = {
  "ur": "یہ میٹر سولر ڈرائیو سے جڑ کر بتاتا ہے کہ ابھی پمپ کتنا پانی نکال رہا ہے اور آج کتنا نکالا۔ اگر پمپ مشورے سے زیادہ دیر چلے تو یہ خبردار کرتا ہے۔ اسے آپ کا انسٹالر جوڑتا ہے۔",
  "urRoman": "Yeh meter solar drive se jur kar batata hai ke abhi pump kitna paani nikaal raha hai aur aaj kitna nikaala. Agar pump mashwaray se zyada der chalay to yeh khabardaar karta hai. Isay aap ka installer jorta hai.",
  "en": "This meter connects to the solar drive and shows how much water the pump is giving now and today. If the pump runs longer than advised, it warns you. Your installer connects it.",
  "pa": "ਇਹ ਮੀਟਰ ਸੋਲਰ ਡਰਾਈਵ ਨਾਲ ਜੁੜ ਕੇ ਦੱਸਦਾ ਹੈ ਕਿ ਹੁਣ ਪੰਪ ਕਿੰਨਾ ਪਾਣੀ ਕੱਢ ਰਿਹਾ ਹੈ ਤੇ ਅੱਜ ਕਿੰਨਾ ਕੱਢਿਆ। ਜੇ ਪੰਪ ਸਲਾਹ ਤੋਂ ਵੱਧ ਚੱਲੇ ਤਾਂ ਇਹ ਖ਼ਬਰਦਾਰ ਕਰਦਾ ਹੈ। ਇਸ ਨੂੰ ਤੁਹਾਡਾ ਇੰਸਟਾਲਰ ਜੋੜਦਾ ਹੈ।",
  "paRoman": "Eh meter solar drive naal jurr ke dassda ae ke hun pump kinna paani kaddh reha ae te ajj kinna kaddhya. Je pump salaah ton vadh challe taan eh khabardaar karda ae. Is nu tuhaada installer jorrda ae."
};

const PROBE: VoiceScript = {
  "ur": "مٹی کا پروب کھیت میں لگتا ہے اور اپنی SIM سے نمی خود بھیجتا ہے۔ پروب پر لکھا کوڈ یہاں ایک بار لکھیں اور جوڑیں دبائیں۔ پھر جب کھیت میں کافی پانی پہنچ جائے گا تو آپ کو پتا چل جائے گا، اور پمپ بکس لگا ہو تو موٹر خود بند ہو جائے گی۔",
  "urRoman": "Mitti ka probe khet mein lagta hai aur apni SIM se nami khud bhejta hai. Probe par likha code yahan aik baar likhein aur jorein dabaayen. Phir jab khet mein kaafi paani pohanch jaaye ga to aap ko pata chal jaaye ga, aur pump box laga ho to motor khud band ho jaaye gi.",
  "en": "The soil probe goes in the field and sends the moisture by itself through its own SIM. Type the code printed on the probe here, once, and press Link. Then you will know when the field has enough water, and with a pump box the motor stops by itself.",
  "pa": "ਮਿੱਟੀ ਦਾ ਪ੍ਰੋਬ ਖੇਤ ਵਿੱਚ ਲੱਗਦਾ ਹੈ ਤੇ ਆਪਣੀ SIM ਨਾਲ ਨਮੀ ਆਪੇ ਭੇਜਦਾ ਹੈ। ਪ੍ਰੋਬ ਉੱਤੇ ਲਿਖਿਆ ਕੋਡ ਇੱਥੇ ਇੱਕ ਵਾਰ ਲਿਖੋ ਤੇ ਜੋੜੋ ਦਬਾਓ। ਫੇਰ ਜਦੋਂ ਖੇਤ ਵਿੱਚ ਕਾਫ਼ੀ ਪਾਣੀ ਪਹੁੰਚ ਜਾਵੇਗਾ ਤਾਂ ਤੁਹਾਨੂੰ ਪਤਾ ਲੱਗ ਜਾਵੇਗਾ, ਤੇ ਪੰਪ ਬਕਸਾ ਲੱਗਿਆ ਹੋਵੇ ਤਾਂ ਮੋਟਰ ਆਪੇ ਬੰਦ ਹੋ ਜਾਵੇਗੀ।",
  "paRoman": "Mitti da probe khet vich lagda ae te apni SIM naal nami aape bhejda ae. Probe utte likhya code ithe ikk vaar likho te jorro dabao. Pher jadon khet vich kaafi paani pohanch jaawe ga taan tuhanu pata lagg jaawe ga, te pump baksa laggya howe taan motor aape band ho jaawe gi."
};

const SOIL: VoiceScript = {
  "ur": "یہ کارڈ پروب سے مٹی کی نمی دکھاتا ہے۔ نمی کم ہو تو زمین خشک ہے۔ نمی پوری ہو جائے تو کھیت میں کافی پانی ہے، پمپ بند کر دیں۔ پروب ایک جگہ کا حال بتاتا ہے، اس لیے کھیت بھی دیکھ لیں۔",
  "urRoman": "Yeh card probe se mitti ki nami dikhata hai. Nami kam ho to zameen khushk hai. Nami poori ho jaaye to khet mein kaafi paani hai, pump band kar den. Probe aik jagah ka haal batata hai, is liye khet bhi dekh len.",
  "en": "This card shows the soil moisture from your probe. Low moisture means the soil is dry. When it is full, the field has enough water, so switch the pump off. The probe shows one spot, so look at your field too.",
  "pa": "ਇਹ ਕਾਰਡ ਪ੍ਰੋਬ ਤੋਂ ਮਿੱਟੀ ਦੀ ਨਮੀ ਵਿਖਾਉਂਦਾ ਹੈ। ਨਮੀ ਘੱਟ ਹੋਵੇ ਤਾਂ ਜ਼ਮੀਨ ਸੁੱਕੀ ਹੈ। ਨਮੀ ਪੂਰੀ ਹੋ ਜਾਵੇ ਤਾਂ ਖੇਤ ਵਿੱਚ ਕਾਫ਼ੀ ਪਾਣੀ ਹੈ, ਪੰਪ ਬੰਦ ਕਰ ਦਿਓ। ਪ੍ਰੋਬ ਇੱਕ ਥਾਂ ਦਾ ਹਾਲ ਦੱਸਦਾ ਹੈ, ਇਸ ਲਈ ਖੇਤ ਵੀ ਵੇਖ ਲਓ।",
  "paRoman": "Eh card probe ton mitti di nami vikhaunda ae. Nami ghatt howe taan zameen sukki ae. Nami poori ho jaawe taan khet vich kaafi paani ae, pump band kar deo. Probe ikk thaan da haal dassda ae, is layi khet vi vekh lao."
};

const CHART: VoiceScript = {
  "ur": "یہ چارٹ پچھلے سات دن دکھاتا ہے۔ نیلا بار وہ پانی ہے جو آپ نے نکالا، سبز بار وہ پانی ہے جو فصل کو چاہیے تھا، اور لال لکیر ضائع پانی ہے۔ نیلا بار سبز سے اونچا ہو تو پانی زیادہ دیا گیا۔",
  "urRoman": "Yeh chart pichlay saat din dikhata hai. Neela baar woh paani hai jo aap ne nikaala, sabz baar woh paani hai jo fasal ko chahiye tha, aur laal lakeer zaaya paani hai. Neela baar sabz se ooncha ho to paani zyada diya gaya.",
  "en": "This chart shows the last seven days. The blue bar is the water you pumped, the green bar is what the crop needed, and the red line is water wasted. When blue is taller than green, too much water was given.",
  "pa": "ਇਹ ਚਾਰਟ ਪਿਛਲੇ ਸੱਤ ਦਿਨ ਵਿਖਾਉਂਦਾ ਹੈ। ਨੀਲਾ ਬਾਰ ਉਹ ਪਾਣੀ ਹੈ ਜੋ ਤੁਸੀਂ ਕੱਢਿਆ, ਹਰਾ ਬਾਰ ਉਹ ਪਾਣੀ ਹੈ ਜੋ ਫ਼ਸਲ ਨੂੰ ਚਾਹੀਦਾ ਸੀ, ਤੇ ਲਾਲ ਲਕੀਰ ਬਰਬਾਦ ਪਾਣੀ ਹੈ। ਨੀਲਾ ਬਾਰ ਹਰੇ ਤੋਂ ਉੱਚਾ ਹੋਵੇ ਤਾਂ ਪਾਣੀ ਵੱਧ ਦਿੱਤਾ ਗਿਆ।",
  "paRoman": "Eh chart pichhle satt din vikhaunda ae. Neela baar oh paani ae jo tusi kaddhya, hara baar oh paani ae jo fasal nu chaahida si, te laal lakeer barbaad paani ae. Neela baar hare ton uchcha howe taan paani vadh dittaa gaya."
};

const FERTILISER: VoiceScript = {
  "ur": "یہاں اپنے مٹی کے ٹیسٹ یا زرعی افسر کی بتائی ہوئی کھاد فی ایکڑ لکھیں۔ ایپ پوری زمین کا حساب کر کے بتاتی ہے کہ یوریا کب اور کتنی ڈالنی ہے، اور تیز بارش ہو تو انتظار کا کہتی ہے۔ کھاد کی مقدار ایپ خود طے نہیں کرتی۔",
  "urRoman": "Yahan apne mitti ke test ya zarai afsar ki batayi hui khaad fi acre likhein. App poori zameen ka hisaab kar ke batati hai ke urea kab aur kitni daalni hai, aur tez baarish ho to intezaar ka kehti hai. Khaad ki miqdaar app khud tay nahin karti.",
  "en": "Enter the fertiliser per acre from your soil test or agriculture officer. The app works out the total for your land and says when and how much urea to apply, and to wait if heavy rain is coming. The app does not decide the amount itself.",
  "pa": "ਇੱਥੇ ਆਪਣੇ ਮਿੱਟੀ ਦੇ ਟੈਸਟ ਜਾਂ ਖੇਤੀ ਅਫ਼ਸਰ ਦੀ ਦੱਸੀ ਖਾਦ ਪ੍ਰਤੀ ਏਕੜ ਲਿਖੋ। ਐਪ ਸਾਰੀ ਜ਼ਮੀਨ ਦਾ ਹਿਸਾਬ ਕਰਕੇ ਦੱਸਦੀ ਹੈ ਕਿ ਯੂਰੀਆ ਕਦੋਂ ਤੇ ਕਿੰਨਾ ਪਾਉਣਾ ਹੈ, ਤੇ ਤੇਜ਼ ਮੀਂਹ ਆਵੇ ਤਾਂ ਉਡੀਕ ਕਰਨ ਨੂੰ ਕਹਿੰਦੀ ਹੈ। ਖਾਦ ਦੀ ਮਿਕਦਾਰ ਐਪ ਆਪ ਤੈਅ ਨਹੀਂ ਕਰਦੀ।",
  "paRoman": "Ithe apne mitti de test ya kheti afsar di dassi khaad prati acre likho. App saari zameen da hisaab karke dassdi ae ke urea kadon te kinna pauna ae, te tez meenh aawe taan udeek karan nu kehndi ae. Khaad di miqdaar app aap tay nahin kardi."
};

const BUCKET: VoiceScript = {
  "ur": "بالٹی ٹیسٹ سے پانی کا حساب آپ کے اپنے پمپ کے مطابق ہو جاتا ہے۔ دوپہر کی دھوپ میں پمپ چلائیں۔ پمپ کے پائپ سے ایک ڈرم یا بالٹی بھریں اور سیکنڈ گنیں۔ برتن کے لیٹر اور سیکنڈ یہاں لکھیں اور بھیج دیں۔",
  "urRoman": "Baalti test se paani ka hisaab aap ke apne pump ke mutaabiq ho jaata hai. Dopehar ki dhoop mein pump chalaayen. Pump ke pipe se aik drum ya baalti bharein aur second ginein. Bartan ke litre aur second yahan likhein aur bhej den.",
  "en": "The bucket test tunes the water meter to your own pump. Run the pump in the midday sun. Fill a drum or bucket from the pump pipe and count the seconds. Enter the litres and the seconds here and send.",
  "pa": "ਬਾਲਟੀ ਟੈਸਟ ਨਾਲ ਪਾਣੀ ਦਾ ਹਿਸਾਬ ਤੁਹਾਡੇ ਆਪਣੇ ਪੰਪ ਮੁਤਾਬਕ ਹੋ ਜਾਂਦਾ ਹੈ। ਦੁਪਹਿਰ ਦੀ ਧੁੱਪ ਵਿੱਚ ਪੰਪ ਚਲਾਓ। ਪੰਪ ਦੀ ਪਾਈਪ ਤੋਂ ਇੱਕ ਡਰੰਮ ਜਾਂ ਬਾਲਟੀ ਭਰੋ ਤੇ ਸਕਿੰਟ ਗਿਣੋ। ਭਾਂਡੇ ਦੇ ਲੀਟਰ ਤੇ ਸਕਿੰਟ ਇੱਥੇ ਲਿਖੋ ਤੇ ਭੇਜ ਦਿਓ।",
  "paRoman": "Baalti test naal paani da hisaab tuhaade apne pump mutaabik ho jaanda ae. Dupehar di dhupp vich pump chalao. Pump di pipe ton ikk drum ya baalti bharo te second gino. Bhaande de litre te second ithe likho te bhej deo."
};

const FIELDCHECK: VoiceScript = {
  "ur": "یہ جانچ بتاتی ہے کہ ایپ کا پانی میٹر کتنا درست ہے۔ پمپ کے پائپ سے ڈرم بھریں، وقت نوٹ کریں، اور ہو سکے تو سولر انورٹر کی اسکرین پر کلو واٹ دیکھ کر لکھیں۔ اس سے میٹر نہیں بدلتا، صرف جانچ ہوتی ہے۔",
  "urRoman": "Yeh jaanch batati hai ke app ka paani meter kitna durust hai. Pump ke pipe se drum bharein, waqt note karein, aur ho sakay to solar inverter ki screen par kilowatt dekh kar likhein. Is se meter nahin badalta, sirf jaanch hoti hai.",
  "en": "This check shows how accurate the app's water meter is. Fill a drum from the pump pipe, note the time, and if you can, read the kilowatts on the solar inverter's screen. It does not change the meter; it only checks it.",
  "pa": "ਇਹ ਜਾਂਚ ਦੱਸਦੀ ਹੈ ਕਿ ਐਪ ਦਾ ਪਾਣੀ ਮੀਟਰ ਕਿੰਨਾ ਠੀਕ ਹੈ। ਪੰਪ ਦੀ ਪਾਈਪ ਤੋਂ ਡਰੰਮ ਭਰੋ, ਸਮਾਂ ਨੋਟ ਕਰੋ, ਤੇ ਹੋ ਸਕੇ ਤਾਂ ਸੋਲਰ ਇਨਵਰਟਰ ਦੀ ਸਕਰੀਨ ਉੱਤੇ ਕਿਲੋਵਾਟ ਵੇਖ ਕੇ ਲਿਖੋ। ਇਸ ਨਾਲ ਮੀਟਰ ਨਹੀਂ ਬਦਲਦਾ, ਸਿਰਫ਼ ਜਾਂਚ ਹੁੰਦੀ ਹੈ।",
  "paRoman": "Eh jaanch dassdi ae ke app da paani meter kinna theek ae. Pump di pipe ton drum bharo, samaan note karo, te ho sake taan solar inverter di screen utte kilowatt vekh ke likho. Is naal meter nahin badalda, sirf jaanch hundi ae."
};

const LOCATION: VoiceScript = {
  ur: "ابھی ہمیں آپ کے کھیت کی صحیح جگہ معلوم نہیں۔ جب آپ اپنے کھیت میں کھڑے ہوں تو یہ پیلا بٹن ایک بار دبائیں۔ پھر بارش اور موسم کا حساب آپ کے اپنے کھیت کا ہو گا۔",
  urRoman: "Abhi humein aap ke khet ki sahi jagah maloom nahin. Jab aap apne khet mein kharay hon to yeh peela button aik baar dabaayen. Phir baarish aur mausam ka hisaab aap ke apne khet ka ho ga.",
  en: "We do not know the exact place of your field yet. When you are standing in your field, press this yellow button once. Then rain and weather will be worked out for your own field.",
  pa: "ਹਾਲੇ ਸਾਨੂੰ ਤੁਹਾਡੇ ਖੇਤ ਦੀ ਠੀਕ ਥਾਂ ਨਹੀਂ ਪਤਾ। ਜਦੋਂ ਤੁਸੀਂ ਆਪਣੇ ਖੇਤ ਵਿੱਚ ਖੜ੍ਹੇ ਹੋਵੋ ਤਾਂ ਇਹ ਪੀਲਾ ਬਟਨ ਇੱਕ ਵਾਰ ਦਬਾਓ। ਫੇਰ ਮੀਂਹ ਤੇ ਮੌਸਮ ਦਾ ਹਿਸਾਬ ਤੁਹਾਡੇ ਆਪਣੇ ਖੇਤ ਦਾ ਹੋਵੇਗਾ।",
  paRoman: "Haale saanu tuhaade khet di theek thaan nahin pata. Jadon tusi apne khet vich kharre hovo taan eh peela button ikk vaar dabao. Pher meenh te mausam da hisaab tuhaade apne khet da howe ga.",
};

const AWARENESS: VoiceScript = {
  ur: "زمین کے نیچے پانی محدود ہے۔ ہم جتنا زیادہ پمپ چلاتے ہیں، پانی کی سطح اتنی نیچے جاتی ہے۔ پھر کنواں گہرا کرنا پڑتا ہے اور پمپ کو زیادہ بجلی چاہیے۔ فصل کو جتنا پانی چاہیے اتنا ہی دیں۔ نیچے دیکھیں کہ اس ہفتے آپ کا کتنا پانی ضائع ہوا۔",
  urRoman: "Zameen ke neeche paani mehdood hai. Hum jitna zyada pump chalaate hain, paani ki sathh utni neeche jaati hai. Phir kuan gehra karna parta hai aur pump ko zyada bijli chahiye. Fasal ko jitna paani chahiye utna hi den. Neeche dekhein ke is hafte aap ka kitna paani zaaya hua.",
  en: "Water under the ground is limited. The more we run the pump, the lower the water level goes. Then the well has to be dug deeper and the pump needs more power. Give the crop only the water it needs. Look below to see how much of your water was wasted this week.",
  pa: "ਜ਼ਮੀਨ ਹੇਠਾਂ ਪਾਣੀ ਸੀਮਤ ਹੈ। ਅਸੀਂ ਜਿੰਨਾ ਵੱਧ ਪੰਪ ਚਲਾਉਂਦੇ ਹਾਂ, ਪਾਣੀ ਦੀ ਸਤ੍ਹਾ ਓਨੀ ਹੇਠਾਂ ਜਾਂਦੀ ਹੈ। ਫੇਰ ਖੂਹ ਡੂੰਘਾ ਕਰਨਾ ਪੈਂਦਾ ਹੈ ਤੇ ਪੰਪ ਨੂੰ ਵੱਧ ਬਿਜਲੀ ਚਾਹੀਦੀ ਹੈ। ਫ਼ਸਲ ਨੂੰ ਜਿੰਨਾ ਪਾਣੀ ਚਾਹੀਦਾ ਹੈ ਓਨਾ ਹੀ ਦਿਓ। ਹੇਠਾਂ ਵੇਖੋ ਕਿ ਇਸ ਹਫ਼ਤੇ ਤੁਹਾਡਾ ਕਿੰਨਾ ਪਾਣੀ ਬਰਬਾਦ ਹੋਇਆ।",
  paRoman: "Zameen hethaan paani seemit ae. Asin jinna vadh pump chalaunde haan, paani di sathh onni hethaan jaandi ae. Pher khooh dunga karna painda ae te pump nu vadh bijli chaahidi ae. Fasal nu jinna paani chaahida ae onna hi deo. Hethaan vekho ke is hafte tuhaada kinna paani barbaad hoya.",
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
    pumpctl: PUMPCTL,
    pumpbox: PUMPBOX,
    timer: TIMER,
    live: LIVE,
    probe: PROBE,
    soil: SOIL,
    chart: CHART,
    fertiliser: FERTILISER,
    bucket: BUCKET,
    fieldcheck: FIELDCHECK,
    awareness: AWARENESS,
    location: s.farm?.locationSource === "district" ? LOCATION : null,
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
