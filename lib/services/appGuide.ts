/**
 * How to use PaaniPulse, in Urdu script, Roman Urdu and English. One entry per feature, written to match what the app really does.
 * Used by (1) the assistant's "getAppGuide" tool and offline answers, (2) the /guide page and its voice note.
 * Keep it honest: say what each feature needs (an installer, a probe, a control box) and what it does NOT do.
 */
export type L3 = { ur: string; roman: string; en: string };

export const GUIDE_TOPICS = [
  "start", "advice", "confidence", "timer", "hours", "weather", "weekly", "fertiliser", "probe", "pumpcontrol", "farms", "bucket", "chart", "setup", "chat", "offline",
] as const;
export type GuideTopic = (typeof GUIDE_TOPICS)[number];

export interface GuideEntry {
  title: L3;
  /** What it is and how to use it: two or three short sentences. */
  how: L3;
  /** Words (English, Roman Urdu, Urdu) that point to this topic in a question. */
  match: RegExp;
}

export const GUIDE: Record<GuideTopic, GuideEntry> = {
  start: {
    title: { en: "Using the app", roman: "App istemal karna", ur: "ایپ کا استعمال" },
    how: {
      en: "Open your farm page. At the top is today's advice: run the pump, or keep it off. Below it are the pump timer, weather, last 7 days, fertiliser, soil probe and pump control. Tap Play voice note to hear today's advice, and the How to use button for the voice guide.",
      roman: "Apne khait ka page kholein. Sab se upar aaj ka mashwara hai: pump chalayen ya band rakhein. Neeche pump timer, mausam, pichle 7 din, khaad, mitti ka probe aur pump control hain. Aaj ka mashwara sunne ke liye Play voice note dabayen, aur awaz wali hidayat ke liye How to use dabayen.",
      ur: "اپنے کھیت کا صفحہ کھولیں۔ سب سے اوپر آج کا مشورہ ہے: پمپ چلائیں یا بند رکھیں۔ نیچے پمپ ٹائمر، موسم، پچھلے 7 دن، کھاد، مٹی کا پروب اور پمپ کنٹرول ہیں۔ آج کا مشورہ سننے کے لیے وائس نوٹ دبائیں، اور آواز والی ہدایت کے لیے استعمال کا طریقہ دبائیں۔",
    },
    match: /(how (do|to|can) i use|how to use|use (the )?app|guide|getting started|start here|kaise (istemal|use)|istemal|hidayat|ہدایت|استعمال|طریقہ)/i,
  },
  advice: {
    title: { en: "Today's advice and water for your field", roman: "Aaj ka mashwara aur khait ka pani", ur: "آج کا مشورہ اور کھیت کا پانی" },
    how: {
      en: "Today's advice says whether to run the pump and for how many hours. On a watering day, 'Water for your field' also says how much water to give, in millimetres and cubic metres for your land. It is a guide: look at your field, and stop if water runs off.",
      roman: "Aaj ka mashwara batata hai ke pump chalana hai ya nahi aur kitne ghantay. Pani dene ke din 'Water for your field' mein millimetre aur aap ki zameen ke liye cubic metre bhi hote hain. Yeh rehnumai hai: apna khait dekhein, pani behne lage to rok dein.",
      ur: "آج کا مشورہ بتاتا ہے کہ پمپ چلانا ہے یا نہیں اور کتنے گھنٹے۔ پانی دینے کے دن 'آپ کے کھیت کے لیے پانی' میں ملی میٹر اور آپ کی زمین کے لیے کیوبک میٹر بھی ہوتے ہیں۔ یہ رہنمائی ہے: اپنا کھیت دیکھیں، پانی بہنے لگے تو روک دیں۔",
    },
    match: /(advice|mashwara|مشورہ|how much water|kitna pani|kitne ghant|hours|water for your field|کھیت کے لیے پانی|run the pump|pump chal)/i,
  },
  confidence: {
    title: { en: "How sure is this advice", roman: "Mashwara kitna pakka hai", ur: "مشورہ کتنا پکا ہے" },
    how: {
      en: "This line says if the advice is High, Medium or Low confidence, and why: for example the weather is not live, the pump is not calibrated, or yesterday's hours are missing. Fix what it says to make the advice more reliable.",
      roman: "Yeh line batati hai ke mashwara High, Medium ya Low bharose ka hai aur kyun: maslan mausam live nahi, pump ki jaanch nahi hui, ya kal ke ghantay nahi bataye. Jo likha ho wo theek karein to mashwara zyada pakka hoga.",
      ur: "یہ لائن بتاتی ہے کہ مشورہ زیادہ، درمیانے یا کم بھروسے کا ہے اور کیوں: مثلاً موسم تازہ نہیں، پمپ کی جانچ نہیں ہوئی، یا کل کے گھنٹے نہیں بتائے۔ جو لکھا ہو اسے ٹھیک کریں تو مشورہ زیادہ پکا ہوگا۔",
    },
    match: /(how sure|confidence|reliable|pakka|bharosa|پکا|بھروسا)/i,
  },
  timer: {
    title: { en: "Pump timer and alarm", roman: "Pump timer aur alarm", ur: "پمپ ٹائمر اور الارم" },
    how: {
      en: "When you switch the pump on, press Start in the pump timer and choose the hours. When the time is up the phone rings loudly, even with no internet, so you can switch the pump off. Keep the app open and the phone awake.",
      roman: "Pump chalayen to pump timer mein Start dabayen aur ghantay chunein. Waqt poora ho to phone zor se bajta hai, internet na ho tab bhi, taake aap pump band karein. App khuli aur phone jaga hua rakhein.",
      ur: "پمپ چلائیں تو پمپ ٹائمر میں شروع دبائیں اور گھنٹے چنیں۔ وقت پورا ہو تو فون زور سے بجتا ہے، انٹرنیٹ نہ ہو تب بھی، تاکہ آپ پمپ بند کریں۔ ایپ کھلی اور فون جاگا ہوا رکھیں۔",
    },
    match: /(timer|alarm|beep|\bring\b|ٹائمر|الارم|ghanti|switch off|band karna yaad)/i,
  },
  hours: {
    title: { en: "Telling the app yesterday's hours", roman: "Kal ke ghantay batana", ur: "کل کے گھنٹے بتانا" },
    how: {
      en: "If the app asks how many hours the pump ran yesterday, tell it. This keeps the soil-water calculation right. The pump timer also saves the hours for you.",
      roman: "Agar app poochay ke kal pump kitne ghantay chala, to bata dein. Is se zameen ke pani ka hisab theek rehta hai. Pump timer bhi ghantay khud save kar leta hai.",
      ur: "اگر ایپ پوچھے کہ کل پمپ کتنے گھنٹے چلا تو بتا دیں۔ اس سے زمین کے پانی کا حساب ٹھیک رہتا ہے۔ پمپ ٹائمر بھی گھنٹے خود محفوظ کر لیتا ہے۔",
    },
    match: /(yesterday|kal ke ghant|report hours|reported|hours i ran|کل کے گھنٹے)/i,
  },
  weather: {
    title: { en: "Weather", roman: "Mausam", ur: "موسم" },
    how: {
      en: "Weather shows now and the next 24 hours. A rain forecast can be wrong: if rain does not come, check the app the next morning and it will tell you to water.",
      roman: "Mausam abhi ka aur agle 24 ghanton ka dikhata hai. Barish ki pesh goi ghalat bhi ho sakti hai: barish na aaye to agli subah app dekhein, wo pani dene ka kahegi.",
      ur: "موسم ابھی کا اور اگلے 24 گھنٹوں کا دکھاتا ہے۔ بارش کی پیش گوئی غلط بھی ہو سکتی ہے: بارش نہ آئے تو اگلی صبح ایپ دیکھیں، وہ پانی دینے کا کہے گی۔",
    },
    match: /(weather card|forecast|hourly|next 24|مستقبل کا موسم)/i,
  },
  weekly: {
    title: { en: "Last 7 days and this week's waste", roman: "Pichle 7 din aur is hafte ka nuqsan", ur: "پچھلے 7 دن اور اس ہفتے کا نقصان" },
    how: {
      en: "The chart shows water pumped against what the crop needed. This week's card shows water, fertiliser and solar energy wasted. Pumping less when the crop does not need water saves all three.",
      roman: "Chart dikhata hai ke pani kitna nikala aur fasal ko kitna chahiye tha. Is hafte ka card pani, khaad aur solar bijli ka nuqsan dikhata hai. Jab fasal ko zaroorat na ho to kam pump chalane se teeno bachte hain.",
      ur: "چارٹ دکھاتا ہے کہ پانی کتنا نکالا اور فصل کو کتنا چاہیے تھا۔ اس ہفتے کا کارڈ پانی، کھاد اور سولر بجلی کا نقصان دکھاتا ہے۔ فصل کو ضرورت نہ ہو تو کم پمپ چلانے سے تینوں بچتے ہیں۔",
    },
    match: /(7 days|seven days|chart|this week|waste|wasted|pichle|hafte|ضائع|ہفتے)/i,
  },
  fertiliser: {
    title: { en: "Fertiliser for your land", roman: "Aap ki zameen ke liye khaad", ur: "آپ کی زمین کے لیے کھاد" },
    how: {
      en: "The app does not decide how much fertiliser to use. Enter the amount per acre from your soil test or agriculture officer, and tick that it is yours. The app then shows the total for your land, splits the urea into doses, and says when to apply it with the irrigation.",
      roman: "App yeh faisla nahi karti ke kitni khaad dalni hai. Apne mitti ke test ya zarai afsar ki batayi hui miqdar fi acre likhein aur tick karein ke yeh aap ki hai. App aap ki zameen ka kul hisab dikhati hai, urea ko hisson mein baantti hai, aur pani ke saath dalne ka waqt batati hai.",
      ur: "ایپ یہ فیصلہ نہیں کرتی کہ کتنی کھاد ڈالنی ہے۔ اپنے مٹی کے ٹیسٹ یا زرعی افسر کی بتائی ہوئی مقدار فی ایکڑ لکھیں اور تصدیق کریں کہ یہ آپ کی ہے۔ ایپ آپ کی زمین کا کل حساب دکھاتی ہے، یوریا کو حصوں میں بانٹتی ہے، اور پانی کے ساتھ ڈالنے کا وقت بتاتی ہے۔",
    },
    match: /(fertili[sz]er|khaad|khad|urea|dap|potash|کھاد|یوریا)/i,
  },
  probe: {
    title: { en: "Soil probe", roman: "Mitti ka probe", ur: "مٹی کا پروب" },
    how: {
      en: "A soil probe in the field measures the moisture and sends it by itself through its own SIM, on 2G, 3G or 4G. To link it, type the code printed on the probe once, in the Soil probe card on your farm page. After that it works wherever you are. With a weak or no network it keeps its readings and sends them later. If you turn on SMS, you get a message when enough water has reached the probe. One probe shows one spot, so check your field.",
      roman: "Khait mein laga mitti ka probe nami naapta hai aur apni SIM se khud bhejta hai, 2G, 3G ya 4G par. Isay jodne ke liye probe par likha code ek baar khait ke page par Soil probe wale card mein likhein. Us ke baad aap jahan bhi hon yeh chalta rehta hai. Network kamzor ho ya na ho to yeh readings sambhal kar baad mein bhej deta hai. SMS on karein to jab probe tak kaafi pani pahunche to message aata hai. Ek probe ek hi jagah ka haal batata hai, is liye khait bhi dekhein.",
      ur: "کھیت میں لگا مٹی کا پروب نمی ناپتا ہے اور اپنی SIM سے خود بھیجتا ہے، 2G، 3G یا 4G پر۔ اسے جوڑنے کے لیے پروب پر لکھا کوڈ ایک بار کھیت کے صفحے پر مٹی کے پروب والے کارڈ میں لکھیں۔ اس کے بعد آپ جہاں بھی ہوں یہ چلتا رہتا ہے۔ نیٹ کمزور ہو یا نہ ہو تو یہ ریڈنگ سنبھال کر بعد میں بھیج دیتا ہے۔ SMS چالو کریں تو جب پروب تک کافی پانی پہنچے تو پیغام آتا ہے۔ ایک پروب ایک ہی جگہ کا حال بتاتا ہے، اس لیے کھیت بھی دیکھیں۔",
    },
    match: /(probe|sensor|bluetooth|moisture|soil now|device code|پروب|سینسر|بلوٹوتھ|نمی|enough water|kafi pani)/i,
  },
  pumpcontrol: {
    title: { en: "Pump control from the phone", roman: "Phone se pump control", ur: "فون سے پمپ کنٹرول" },
    how: {
      en: "An electrician fits a SIM control box on the pump. It is a separate device from the soil probe. Type the code printed on the box once, in the Pump control box card on your farm page, and confirm the safety checklist. Then you can switch the motor on for set hours or off from your phone, sitting anywhere, on 2G, 3G or 4G. Every run stops by itself at the set time, even if the network fails. Keep your local switch.",
      roman: "Electrician pump par SIM wala control box lagata hai. Yeh mitti ke probe se alag device hai. Box par likha code ek baar khait ke page par Pump control box wale card mein likhein aur safety ki tasdeeq karein. Phir aap kahin bhi baith kar phone se motor muqarrar ghantay ke liye chala ya band kar sakte hain, 2G, 3G ya 4G par. Har baar waqt poora hone par pump khud band ho jata hai, network ho ya na ho. Apna haath wala switch rakhein.",
      ur: "الیکٹریشن پمپ پر SIM والا کنٹرول بکس لگاتا ہے۔ یہ مٹی کے پروب سے الگ آلہ ہے۔ بکس پر لکھا کوڈ ایک بار کھیت کے صفحے پر پمپ کنٹرول بکس والے کارڈ میں لکھیں اور حفاظت کی تصدیق کریں۔ پھر آپ کہیں بھی بیٹھ کر فون سے موٹر مقررہ گھنٹوں کے لیے چلا یا بند کر سکتے ہیں، 2G، 3G یا 4G پر۔ ہر بار وقت پورا ہونے پر پمپ خود بند ہو جاتا ہے، نیٹ ہو یا نہ ہو۔ اپنا ہاتھ والا سوئچ رکھیں۔",
    },
    match: /((phone|mobile|app)[^.?]{0,25}(pump|motor)|(pump|motor)[^.?]{0,25}(phone|mobile)|phone se|band kar sak|shuru kar sak|بند کر سک|فون سے|motor|motar|control box|remote|start the pump|stop the pump|switch on|turn on|turn off|auto.?stop|موٹر|کنٹرول|بند کرنا|شروع کرنا|pump control)/i,
  },
  farms: {
    title: { en: "Several farms", roman: "Kai khait", ur: "ایک سے زیادہ کھیت" },
    how: {
      en: "Tap Add a farm to create another farm in your account, up to 10. Use the farm list at the top to switch between them. All my farms shows each farm's advice, pump and probe. Each farm has its own pump and probe.",
      roman: "Apne account mein dusra khait banane ke liye Add a farm dabayen, 10 tak. Upar ki fehrist se khet badlein. All my farms har khait ka mashwara, pump aur probe dikhata hai. Har khait ka apna pump aur probe hota hai.",
      ur: "اپنے اکاؤنٹ میں دوسرا کھیت بنانے کے لیے کھیت شامل کریں دبائیں، 10 تک۔ اوپر کی فہرست سے کھیت بدلیں۔ میرے تمام کھیت ہر کھیت کا مشورہ، پمپ اور پروب دکھاتا ہے۔ ہر کھیت کا اپنا پمپ اور پروب ہوتا ہے۔",
    },
    match: /(add a farm|new farm|another farm|more than one farm|multiple farms|switch farm|all my farms|naya khait|dusra khait|کھیت شامل|نیا کھیت|دوسرا کھیت)/i,
  },
  bucket: {
    title: { en: "Bucket test (calibration)", roman: "Bucket test (jaanch)", ur: "بالٹی ٹیسٹ (جانچ)" },
    how: {
      en: "Fill a container of known size from the pump outlet and time it. Enter the litres and the seconds in the bucket test card. This fits the water estimate to your pump and makes the advice more accurate.",
      roman: "Pump ke nikas se maloom size ka bartan bharein aur waqt naapein. Bucket test card mein litre aur seconds likhein. Is se pani ka andaza aap ke pump ke mutabiq ho jata hai aur mashwara zyada durust hota hai.",
      ur: "پمپ کے نکاس سے معلوم سائز کا برتن بھریں اور وقت ناپیں۔ بالٹی ٹیسٹ کارڈ میں لیٹر اور سیکنڈ لکھیں۔ اس سے پانی کا اندازہ آپ کے پمپ کے مطابق ہو جاتا ہے اور مشورہ زیادہ درست ہوتا ہے۔",
    },
    match: /(bucket|calibrat|drum|jaanch|بالٹی|جانچ)/i,
  },
  chart: {
    title: { en: "Water chart", roman: "Pani ka chart", ur: "پانی کا چارٹ" },
    how: {
      en: "The Water chart page needs no sign-in and no sensors. Choose your crop, its stage, your soil, the season and your land, and it says how often to irrigate and how much water. Find it from the home page.",
      roman: "Pani ka chart page ke liye sign-in aur sensor nahi chahiye. Fasal, uska marhala, zameen, mausam aur apni zameen chunein, ye batata hai ke kitne din baad aur kitna pani dena hai. Isay home page se dhoondein.",
      ur: "پانی کے چارٹ کے لیے سائن ان اور سینسر نہیں چاہیے۔ فصل، اس کا مرحلہ، زمین، موسم اور اپنی زمین چنیں، یہ بتاتا ہے کہ کتنے دن بعد اور کتنا پانی دینا ہے۔ اسے ہوم پیج سے ڈھونڈیں۔",
    },
    match: /(water chart|look.?up|\btable\b|pani ka chart|پانی کا چارٹ)/i,
  },
  setup: {
    title: { en: "Farm set-up", roman: "Khait ki maloomat", ur: "کھیت کی معلومات" },
    how: {
      en: "When you add a farm, choose the crop, the variety (or I don't know), the sowing date, your land in acre, kanal, marla, murabba or ghumaon, how you water, your soil type, and how long the crop takes to ripen. Better details give better advice.",
      roman: "Khait shamil karte waqt fasal, qism (ya mujhe maloom nahi), bowai ki tareekh, zameen acre, kanal, marla, murabba ya ghumaon mein, pani lagane ka tareeqa, zameen ki qism aur fasal pakne ka waqt chunein. Behtar maloomat se behtar mashwara milta hai.",
      ur: "کھیت شامل کرتے وقت فصل، قسم (یا مجھے معلوم نہیں)، بوائی کی تاریخ، زمین ایکڑ، کنال، مرلہ، مربع یا گھماؤں میں، پانی لگانے کا طریقہ، زمین کی قسم اور فصل پکنے کا وقت چنیں۔ بہتر معلومات سے بہتر مشورہ ملتا ہے۔",
    },
    match: /(variety|qism|soil type|kanal|marla|murabba|ghumaon|sowing|crop type|set.?up|register|ripen|قسم|کنال|مرلہ|مربع|بوائی)/i,
  },
  chat: {
    title: { en: "Asking the assistant", roman: "Madadgar se poochna", ur: "مددگار سے پوچھنا" },
    how: {
      en: "Ask the assistant by typing or by voice, in Urdu, Roman Urdu or English. It can answer about today's advice, weather, water use, income from spare solar, and how to use any part of the app.",
      roman: "Madadgar se likh kar ya awaz mein poochein, Urdu, Roman Urdu ya English mein. Wo aaj ke mashwara, mausam, pani ke istemal, faltu solar se kamai aur app ke har hissay ke istemal ke baare mein bata sakta hai.",
      ur: "مددگار سے لکھ کر یا آواز میں پوچھیں، اردو، رومن اردو یا انگریزی میں۔ وہ آج کے مشورے، موسم، پانی کے استعمال، فالتو سولر سے کمائی اور ایپ کے ہر حصے کے استعمال کے بارے میں بتا سکتا ہے۔",
    },
    match: /(assistant|madadgar|voice question|ask by voice|\bmic\b|مددگار|مائیک)/i,
  },
  offline: {
    title: { en: "No internet", roman: "Internet na ho", ur: "انٹرنیٹ نہ ہو" },
    how: {
      en: "With no internet the last advice is saved on your phone and still opens. Hours you report wait and are sent later. Turn on SMS in Account to get the advice by text message.",
      roman: "Internet na ho to aakhri mashwara phone mein mehfooz rehta hai aur khul jata hai. Jo ghantay aap bataein wo rukte hain aur baad mein bhej diye jate hain. Account mein SMS on karein to mashwara text message mein mile ga.",
      ur: "انٹرنیٹ نہ ہو تو آخری مشورہ فون میں محفوظ رہتا ہے اور کھل جاتا ہے۔ جو گھنٹے آپ بتائیں وہ رکتے ہیں اور بعد میں بھیج دیے جاتے ہیں۔ اکاؤنٹ میں SMS چالو کریں تو مشورہ ٹیکسٹ پیغام میں ملے گا۔",
    },
    match: /(offline|no internet|without internet|sms|text message|internet nahi|انٹرنیٹ|پیغام)/i,
  },
};

/** The topic a question is about, or null. More specific features are checked before the general ones. */
const ORDER: GuideTopic[] = ["fertiliser", "pumpcontrol", "probe", "farms", "timer", "bucket", "chart", "confidence", "setup", "offline", "chat", "hours", "weekly", "weather", "start", "advice"];
export function matchGuideTopic(text: string): GuideTopic | null {
  for (const t of ORDER) if (GUIDE[t].match.test(text)) return t;
  return null;
}

/** The whole-app voice note, in reading order. Urdu is under 1,400 characters so the neural voice can read it in one go. */
export const GUIDE_VOICE: L3 = {
  ur: "پانی پلس میں خوش آمدید۔ آپ کے کھیت کے صفحے پر سب سے اوپر آج کا مشورہ ہے: پمپ چلانا ہے یا بند رکھنا ہے، اور کتنے گھنٹے۔ سننے کے لیے وائس نوٹ دبائیں۔ پانی دینے کے دن آپ کے کھیت کے لیے پانی بتاتا ہے کہ آپ کی زمین کو کتنا پانی چاہیے۔ اس کے نیچے لکھا ہے کہ مشورہ کتنا پکا ہے اور کیوں۔ پمپ چلائیں تو پمپ ٹائمر شروع کریں؛ وقت پورا ہونے پر فون زور سے بجے گا، انٹرنیٹ نہ ہو تب بھی۔ اگر ایپ پوچھے تو کل پمپ کے گھنٹے بتا دیں۔ نیچے موسم، پچھلے سات دن، اور فالتو پانی، کھاد اور بجلی کا نقصان ہے۔ کھاد کے کارڈ میں مٹی کے ٹیسٹ یا زرعی افسر کی بتائی مقدار لکھیں؛ ایپ آپ کی زمین کا کل حساب اور کھاد ڈالنے کا وقت بتائے گی۔ مٹی کا پروب جڑ جائے تو ایپ بتائے گی کہ کھیت میں پانی کتنا پہنچا، اور کافی پانی پہنچنے پر پیغام بھی آ سکتا ہے۔ اگر انسٹالر نے کنٹرول بکس لگایا ہو تو پمپ کنٹرول سے فون پر پمپ شروع یا بند کر سکتے ہیں، مگر اپنا ہاتھ والا سوئچ ضرور رکھیں۔ ایک سے زیادہ کھیت ہوں تو کھیت شامل کریں دبائیں اور اوپر کی فہرست سے بدلیں۔ کوئی بات سمجھ نہ آئے تو مددگار سے آواز یا لکھ کر پوچھیں۔ یاد رکھیں: ایپ مشورہ دیتی ہے، فیصلہ ہمیشہ آپ کا ہے۔",
  roman: "PaaniPulse mein khush aamdeed. Aap ke khait ke page par sab se upar aaj ka mashwara hai: pump chalana hai ya band rakhna hai, aur kitne ghantay. Sunne ke liye Play voice note dabayen. Pani dene ke din Water for your field batata hai ke aap ki zameen ko kitna pani chahiye. Is ke neeche likha hai ke mashwara kitna pakka hai aur kyun. Pump chalayen to pump timer shuru karein; waqt poora hone par phone zor se bajega, internet na ho tab bhi. Agar app poochay to kal pump ke ghantay bata dein. Neeche mausam, pichle saat din, aur faltu pani, khaad aur bijli ka nuqsan hai. Khaad ke card mein mitti ke test ya zarai afsar ki batayi miqdar likhein; app aap ki zameen ka kul hisab aur khaad dalne ka waqt batayegi. Mitti ka probe jur jaye to app batayegi ke khait mein pani kitna pahuncha, aur kaafi pani pahunchne par message bhi aa sakta hai. Agar installer ne control box lagaya ho to pump control se phone par pump shuru ya band kar sakte hain, magar apna haath wala switch zaroor rakhein. Ek se zyada khait hon to Add a farm dabayen aur upar ki fehrist se badlein. Koi baat samajh na aaye to madadgar se awaz ya likh kar poochein. Yaad rakhein: app mashwara deti hai, faisla hamesha aap ka hai.",
  en: "Welcome to PaaniPulse. At the top of your farm page is today's advice: whether to run the pump or keep it off, and for how many hours. Tap Play voice note to hear it. On a watering day, Water for your field says how much water your land needs. Below it, a line says how sure the advice is and why. When you run the pump, start the pump timer; when time is up the phone rings loudly, even with no internet. If the app asks, tell it yesterday's pump hours. Further down are the weather, the last seven days, and the water, fertiliser and solar energy wasted. In the fertiliser card, enter the amount from your soil test or agriculture officer; the app works out the total for your land and when to apply it. When a soil probe is connected, the app shows how much water has reached it, and can send a message when there is enough. If your installer has fitted a control box, Pump control lets you start or stop the pump from your phone, but always keep your local switch. If you have more than one farm, tap Add a farm and switch from the list at the top. If anything is unclear, ask the assistant by voice or text. Remember: the app advises, the decision is always yours.",
};
