// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
// English / Persian (RTL) localisation. Each entry is [english, persian]; {name} placeholders are substituted.
import { settings } from './settings.js';

const D = {
  'game.title': ['Iron Crown: Medieval Kingdoms', 'تاج آهنین: پادشاهی‌های قرون وسطی'],
  'game.sub': ['A real-time strategy game of castles, armies and sieges', 'بازی استراتژی بی‌درنگ قلعه‌ها، ارتش‌ها و محاصره‌ها'],
  'dev.by': ['Developed by', 'توسعه‌دهنده'], 'dev.name': ['Hamid Yarali', 'حمید یارعلی'],
  'copyright': ['Copyright © 2026 Hamid Yarali. All Rights Reserved.', 'کپی‌رایت © ۲۰۲۶ حمید یارعلی. تمامی حقوق محفوظ است.'],
  'version': ['Version', 'نسخه'],
  // generic
  'ok': ['OK', 'تأیید'], 'cancel': ['Cancel', 'انصراف'], 'back': ['Back', 'بازگشت'], 'close': ['Close', 'بستن'], 'yes': ['Yes', 'بله'], 'no': ['No', 'خیر'], 'apply': ['Apply', 'اعمال'],
  'start': ['Start', 'شروع'], 'play': ['Play', 'بازی'], 'delete': ['Delete', 'حذف'], 'save': ['Save', 'ذخیره'], 'load': ['Load', 'بارگذاری'], 'empty': ['Empty slot', 'خانهٔ خالی'], 'autosave': ['Autosave', 'ذخیرهٔ خودکار'],
  'on': ['On', 'روشن'], 'off': ['Off', 'خاموش'], 'default': ['Default', 'پیش‌فرض'], 'reset': ['Reset to defaults', 'بازگشت به پیش‌فرض'], 'none': ['None', 'هیچ'],
  // main menu
  'menu.continue': ['Continue', 'ادامه'], 'menu.new': ['New Game', 'بازی جدید'], 'menu.campaign': ['Campaign', 'کمپین'], 'menu.skirmish': ['Skirmish', 'نبرد آزاد'], 'menu.free': ['Free Build', 'ساخت آزاد'],
  'menu.custom': ['Custom Battle', 'نبرد سفارشی'], 'menu.load': ['Load Game', 'بارگذاری بازی'], 'menu.settings': ['Settings', 'تنظیمات'], 'menu.credits': ['Credits', 'سازندگان'], 'menu.exit': ['Exit', 'خروج'],
  'menu.newTitle': ['Choose a game mode', 'حالت بازی را انتخاب کنید'],
  'menu.campaignDesc': ['Seven missions from a humble village to a mighty crown.', 'هفت مأموریت از یک روستای ساده تا تاج و تخت.'],
  'menu.skirmishDesc': ['Build, expand and conquer against AI kingdoms.', 'بساز، گسترش بده و پادشاهی‌های هوش‌مصنوعی را فتح کن.'],
  'menu.freeDesc': ['No enemies. Build the kingdom of your dreams.', 'بدون دشمن؛ پادشاهی رؤیاهایت را بساز.'],
  'menu.customDesc': ['Set up a battle: attack or defend a fortress.', 'یک نبرد بساز: به قلعه حمله کن یا از آن دفاع کن.'],
  // pause
  'pause.title': ['Game Paused', 'بازی متوقف شد'], 'pause.resume': ['Resume', 'ادامه بازی'], 'pause.save': ['Save Game', 'ذخیرهٔ بازی'], 'pause.load': ['Load Game', 'بارگذاری بازی'], 'pause.settings': ['Settings', 'تنظیمات'],
  'pause.restart': ['Restart', 'شروع دوباره'], 'pause.menu': ['Main Menu', 'منوی اصلی'], 'pause.confirmMenu': ['Leave this game? Unsaved progress will be lost.', 'از بازی خارج می‌شوید؟ پیشرفت ذخیره‌نشده از بین می‌رود.'],
  'pause.confirmRestart': ['Restart this game from the beginning?', 'بازی از ابتدا شروع شود؟'],
  // setup
  'set.map': ['Map', 'نقشه'], 'set.size': ['Map size', 'اندازهٔ نقشه'], 'set.enemies': ['Enemy kingdoms', 'پادشاهی‌های دشمن'], 'set.diff': ['AI difficulty', 'سختی هوش مصنوعی'], 'set.res': ['Starting resources', 'منابع اولیه'],
  'set.victory': ['Victory condition', 'شرط پیروزی'], 'set.seed': ['Seed', 'بذر نقشه'], 'set.name': ['Your name', 'نام شما'], 'set.role': ['Your role', 'نقش شما'], 'set.fort': ['Fortress', 'استحکامات'], 'set.army': ['Army size', 'اندازهٔ ارتش'],
  'size.small': ['Small', 'کوچک'], 'size.medium': ['Medium', 'متوسط'], 'size.large': ['Large', 'بزرگ'], 'size.epic': ['Epic', 'حماسی'],
  'diff.easy': ['Easy', 'آسان'], 'diff.normal': ['Normal', 'معمولی'], 'diff.hard': ['Hard', 'سخت'], 'diff.expert': ['Expert', 'استادانه'],
  'res.low': ['Low', 'کم'], 'res.normal': ['Normal', 'معمولی'], 'res.high': ['High', 'زیاد'], 'res.rich': ['Rich', 'ثروتمند'],
  'vic.conquest': ['Conquest', 'تسخیر'], 'vic.wealth': ['Wealth (3000 gold)', 'ثروت (۳۰۰۰ طلا)'], 'vic.timed': ['Timed (30 min score)', 'زمان‌دار (امتیاز ۳۰ دقیقه)'],
  'role.attack': ['Attack the fortress', 'حمله به قلعه'], 'role.defend': ['Defend the fortress', 'دفاع از قلعه'],
  'fort.none': ['Open field', 'میدان باز'], 'fort.light': ['Light fort', 'دژ سبک'], 'fort.castle': ['Great castle', 'قلعهٔ بزرگ'],
  'map.greenvalley': ['Green Valley', 'دره سبز'], 'map.highlands': ['Frostpeak Highlands', 'ارتفاعات یخ‌کوه'], 'map.riverkingdom': ['River Kingdom', 'قلمرو رودخانه'], 'map.forestfrontier': ['Forest Frontier', 'مرز جنگلی'],
  'map.rockyfortress': ['Rocky Fortress', 'دژ صخره‌ای'], 'map.desert': ['Sunscorch Desert', 'صحرای آفتاب‌سوز'], 'map.plains': ['Open Plains', 'دشت‌های باز'], 'map.random': ['Random Map', 'نقشهٔ تصادفی'],
  'map.randomize': ['Randomize', 'تصادفی'],
  // campaign
  'camp.title': ['Campaign', 'کمپین'], 'camp.mission': ['Mission {n}', 'مأموریت {n}'], 'camp.locked': ['Locked', 'قفل'], 'camp.done': ['Completed', 'تکمیل‌شده'], 'camp.reward': ['Reward', 'پاداش'], 'camp.begin': ['Begin mission', 'شروع مأموریت'],
  'mis1.t': ['A Humble Beginning', 'آغازی فروتنانه'], 'mis1.i': ['Our village needs soldiers. Raise a barracks, grow to 22 villagers and soldiers, then drive the raiders from the valley.', 'روستای ما به سرباز نیاز دارد. سربازخانه بساز، جمعیت را به ۲۲ نفر برسان و مهاجمان را از دره بیرون کن.'],
  'mis2.t': ['The Frozen Pass', 'گردنهٔ یخ‌زده'], 'mis2.i': ['Winter closes in. Hold out for seven minutes, raise two guard towers, then march on the enemy keep.', 'زمستان نزدیک می‌شود. هفت دقیقه مقاومت کن، دو برج نگهبانی بساز و سپس به دژ دشمن حمله کن.'],
  'mis3.t': ['Across the River', 'آن سوی رودخانه'], 'mis3.i': ['The river divides two realms. Build a bridge, gather an army of 18 and take the far castle.', 'رودخانه دو قلمرو را جدا می‌کند. پلی بساز، ارتشی با ۱۸ نیرو گرد آور و قلعهٔ آن سو را بگیر.'],
  'mis4.t': ['Gold of the Forest', 'طلای جنگل'], 'mis4.i': ['Two rivals lurk in the forest. Amass 1500 gold to fund the war, then crush them both.', 'دو رقیب در جنگل کمین کرده‌اند. ۱۵۰۰ طلا جمع کن تا هزینهٔ جنگ را تأمین کنی و هر دو را درهم بشکن.'],
  'mis5.t': ['The Rocky Fortress', 'دژ صخره‌ای'], 'mis5.i': ['Their walls are high. Build a siege workshop, bring rams and catapults, and break the fortress.', 'دیوارهایشان بلند است. کارگاه محاصره بساز، قوچ و منجنیق بیاور و دژ را درهم شکن.'],
  'mis6.t': ['Desert Sands', 'ماسه‌های صحرا'], 'mis6.i': ['Two armies converge on your oasis. Survive ten minutes of siege, then destroy both kingdoms.', 'دو ارتش به واحهٔ تو هجوم می‌آورند. ده دقیقه محاصره را تاب بیاور و سپس هر دو پادشاهی را نابود کن.'],
  'mis7.t': ['The Iron Crown', 'تاج آهنین'], 'mis7.i': ['The final war. Two mighty kingdoms stand between you and the Iron Crown. Leave no castle standing.', 'جنگ نهایی. دو پادشاهی نیرومند میان تو و تاج آهنین ایستاده‌اند. هیچ قلعه‌ای را سالم نگذار.'],
  // objectives
  'o.build': ['Build {key} ×{n}', 'ساخت {key} ×{n}'], 'o.pop': ['Reach population {n}', 'رسیدن به جمعیت {n}'], 'o.army': ['Raise an army of {n}', 'ساخت ارتشی با {n} نیرو'], 'o.gold': ['Hold {n} gold', 'داشتن {n} طلا'],
  'o.kill': ['Defeat {n} enemies', 'شکست {n} دشمن'], 'o.survive': ['Survive {n}', 'زنده ماندن به مدت {n}'], 'o.destroy': ['Destroy all enemy kingdoms', 'نابودی تمام پادشاهی‌های دشمن'], 'obj.title': ['Objectives', 'اهداف'],
  'oo.build': ['Construction', 'ساخت‌وساز'], 'oo.pop': ['Population', 'جمعیت'], 'oo.army': ['Army', 'ارتش'], 'oo.gold': ['Gold', 'طلا'], 'oo.kill': ['Enemies defeated', 'شکست دشمنان'], 'oo.survive': ['Survival', 'بقا'], 'oo.destroy': ['Conquest', 'تسخیر'],
  // game over
  'over.win': ['Victory!', 'پیروزی!'], 'over.lose': ['Defeat', 'شکست'],
  'over.capital': ['Your capital has fallen.', 'پایتخت شما سقوط کرد.'], 'over.conquest': ['All rival kingdoms have been conquered.', 'تمام پادشاهی‌های رقیب تسخیر شدند.'], 'over.objectives': ['All mission objectives completed.', 'همهٔ اهداف مأموریت انجام شد.'],
  'over.wealth': ['Your treasury overflows with gold.', 'خزانهٔ شما از طلا لبریز شد.'], 'over.timed': ['The time limit has been reached.', 'مهلت زمانی به پایان رسید.'],
  'over.time': ['Game time', 'زمان بازی'], 'over.kills': ['Enemies defeated', 'دشمنان شکست‌خورده'], 'over.lost': ['Units lost', 'نیروهای از دست‌رفته'], 'over.built': ['Buildings built', 'ساختمان‌های ساخته‌شده'], 'over.gathered': ['Resources gathered', 'منابع جمع‌آوری‌شده'],
  'over.next': ['Next mission', 'مأموریت بعدی'], 'over.retry': ['Try again', 'تلاش دوباره'], 'over.keep': ['Keep playing', 'ادامهٔ بازی'], 'over.menu': ['Main menu', 'منوی اصلی'],
  // resources
  'r.wood': ['Wood', 'چوب'], 'r.stone': ['Stone', 'سنگ'], 'r.iron': ['Iron', 'آهن'], 'r.gold': ['Gold', 'طلا'], 'r.food': ['Food', 'غذا'], 'r.wheat': ['Wheat', 'گندم'], 'r.flour': ['Flour', 'آرد'], 'r.bread': ['Bread', 'نان'],
  'hud.pop': ['Population', 'جمعیت'], 'hud.army': ['Soldiers', 'سربازان'], 'hud.vill': ['Villagers', 'روستاییان'], 'hud.happy': ['Happiness', 'رضایت مردم'], 'hud.tax': ['Tax rate', 'نرخ مالیات'], 'hud.foodsup': ['Food supply', 'ذخیرهٔ غذا'],
  'hud.speed': ['Game speed', 'سرعت بازی'], 'hud.time': ['Time', 'زمان'], 'hud.menu': ['Menu', 'منو'], 'hud.starving': ['Starving!', 'قحطی!'], 'hud.food.days': ['{n}s of food left', 'غذا برای {n} ثانیه'],
  'tax.0': ['None', 'بدون مالیات'], 'tax.1': ['Low', 'کم'], 'tax.2': ['Normal', 'معمولی'], 'tax.3': ['High', 'زیاد'],
  'hud.paused': ['PAUSED', 'متوقف'], 'hud.cost': ['Cost', 'هزینه'], 'hud.time.s': ['{n}s', '{n} ث'], 'hud.income': ['per second', 'در ثانیه'], 'hud.fps': ['FPS', 'فریم'],
  'hud.noaff': ['Not enough resources', 'منابع کافی نیست'], 'hud.popfull': ['Housing is full – build houses', 'ظرفیت مسکن پر است – خانه بسازید'],
  // panels
  'cat.eco': ['Economy', 'اقتصاد'], 'cat.mil': ['Military', 'نظامی'], 'cat.def': ['Defence', 'دفاع'], 'cat.admin': ['Admin', 'اداری'],
  'panel.build': ['Construction', 'ساخت‌وساز'], 'panel.army': ['Army', 'ارتش'], 'panel.tech': ['Technology', 'فناوری'], 'panel.kingdom': ['Kingdom', 'پادشاهی'],
  'panel.market': ['Market', 'بازار'], 'panel.sel': ['Selection', 'انتخاب'], 'panel.none': ['Nothing selected', 'چیزی انتخاب نشده'],
  'k.title': ['Kingdom overview', 'نمای کلی پادشاهی'], 'k.buildings': ['Buildings', 'ساختمان‌ها'], 'k.balance': ['Resource balance', 'تراز منابع'], 'k.income': ['Income', 'درآمد'], 'k.spend': ['Spending', 'هزینه'],
  'k.armyTitle': ['Army', 'ارتش'], 'k.idle': ['Idle villagers', 'روستاییان بیکار'], 'k.score': ['Score', 'امتیاز'], 'k.rivals': ['Rival kingdoms', 'پادشاهی‌های رقیب'], 'k.defeated': ['Defeated', 'شکست‌خورده'], 'k.tax.hint': ['Higher tax earns more gold but lowers happiness.', 'مالیات بیشتر طلا می‌آورد اما رضایت را کم می‌کند.'],
  // selection / commands
  'sel.units': ['{n} units selected', '{n} واحد انتخاب شد'], 'sel.hp': ['Health', 'سلامت'], 'sel.atk': ['Attack', 'حمله'], 'sel.def': ['Armor', 'زره'], 'sel.speed': ['Speed', 'سرعت'], 'sel.range': ['Range', 'برد'], 'sel.state': ['State', 'وضعیت'],
  'st.idle': ['Idle', 'بیکار'], 'st.walk': ['Moving', 'در حرکت'], 'st.attack': ['Fighting', 'در نبرد'], 'st.work': ['Working', 'در حال کار'], 'st.cheer': ['Celebrating', 'جشن'], 'st.die': ['Dead', 'مرده'],
  'cmd.stop': ['Stop', 'توقف'], 'cmd.patrol': ['Patrol', 'گشت‌زنی'], 'cmd.attackmove': ['Attack-move', 'حرکت و حمله'], 'cmd.garrison': ['Garrison', 'استقرار در برج'], 'cmd.retreat': ['Retreat', 'عقب‌نشینی'], 'cmd.formation': ['Formation', 'آرایش'], 'cmd.stance': ['Stance', 'حالت رزم'],
  'cmd.ungarrison': ['Leave tower', 'خروج از برج'],
  'form.line': ['Line', 'صف'], 'form.square': ['Square', 'مربع'], 'form.shieldwall': ['Shield wall', 'دیوار سپر'], 'form.wedge': ['Wedge', 'گوه'], 'form.archer': ['Archer arc', 'کمانی'], 'form.charge': ['Charge', 'یورش'],
  'stance.aggressive': ['Aggressive', 'تهاجمی'], 'stance.defensive': ['Defensive', 'تدافعی'], 'stance.hold': ['Hold position', 'حفظ موقعیت'], 'stance.passive': ['Passive', 'منفعل'],
  'bld.level': ['Level {n}', 'سطح {n}'], 'bld.workers': ['Workers', 'کارگران'], 'bld.upgrade': ['Upgrade', 'ارتقا'], 'bld.demolish': ['Demolish', 'تخریب'], 'bld.relocate': ['Relocate', 'جابه‌جایی'], 'bld.rally': ['Set rally point', 'تعیین نقطهٔ تجمع'], 'bld.queue': ['Queue', 'صف تولید'],
  'bld.train': ['Train', 'آموزش'], 'bld.research': ['Research', 'پژوهش'], 'bld.garrison': ['Garrison', 'پادگان'], 'bld.building': ['Under construction', 'در حال ساخت'], 'bld.upgrading': ['Upgrading…', 'در حال ارتقا…'],
  'bld.limit': ['Limit reached', 'به سقف مجاز رسیده'], 'bld.needtech': ['Requires: {t}', 'نیازمند: {t}'], 'bld.confirmDemolish': ['Demolish this building? 50% of the cost is refunded.', 'این ساختمان تخریب شود؟ ۵۰٪ هزینه بازگردانده می‌شود.'],
  'bld.produces': ['Produces', 'تولید'], 'bld.needs': ['Needs', 'مصرف'], 'bld.per': ['per {n}s', 'هر {n} ثانیه'], 'bld.pop': ['Housing +{n}', 'مسکن +{n}'], 'bld.store': ['Storage +{n}', 'انبار +{n}'], 'bld.upkeep': ['Upkeep {n}/10s', 'نگهداری {n}/۱۰ث'],
  'bld.tower': ['Range {r} · Damage {d} · Slots {s}', 'برد {r} · آسیب {d} · ظرفیت {s}'], 'bld.hp': ['Health', 'سلامت'], 'bld.size': ['Size', 'اندازه'], 'bld.trains': ['Trains', 'آموزش می‌دهد'],
  'place.hint': ['Left-click: place · R: rotate · Right-click / Esc: cancel', 'کلیک چپ: ساخت · R: چرخش · کلیک راست / Esc: لغو'],
  'place.hintLine': ['Drag to build a line · Right-click / Esc: cancel', 'برای ساخت ردیفی بکشید · کلیک راست / Esc: لغو'],
  'place.hintT': ['Drag to position · ✓ build · ⟳ rotate · ✕ cancel', 'برای جابه‌جایی بکشید · ✓ ساخت · ⟳ چرخش · ✕ لغو'],
  'place.hintLineT': ['Drag to build a line · ✕ cancel', 'برای ساخت ردیفی بکشید · ✕ لغو'],
  'rally.tap': ['Tap the ground to set the rally point', 'برای تعیین نقطهٔ تجمع روی زمین لمس کنید'],
  'tip.touch': ['Tap to select · with units selected tap to move or attack · drag: pan · pinch: zoom and rotate · hold and drag: box-select', 'لمس: انتخاب · با واحد انتخاب‌شده لمس زمین یا دشمن: حرکت یا حمله · کشیدن: جابه‌جایی نقشه · دو انگشت: بزرگ‌نمایی و چرخش · نگه‌داشتن و کشیدن: انتخاب جعبه‌ای'],
  'grp.hint': ['Tap an empty slot to save the selected units; tap a saved group to select it; hold a slot to overwrite it.', 'برای ذخیرهٔ واحدهای انتخاب‌شده خانهٔ خالی را لمس کنید؛ گروه ذخیره‌شده را لمس کنید تا انتخاب شود؛ برای جایگزینی خانه را نگه دارید.'],
  'tb.ok': ['Build here', 'همین‌جا بساز'], 'tb.rotate': ['Rotate', 'چرخاندن'], 'tb.cancel': ['Cancel', 'لغو'], 'tb.deselect': ['Deselect', 'لغو انتخاب'],
  'err.webview': ['Your Android System WebView is outdated. Update "Android System WebView" (or Chrome) and open the game again.', 'نسخهٔ Android System WebView گوشی قدیمی است. آن را (یا مرورگر Chrome را) به‌روزرسانی کنید و دوباره بازی را باز کنید.'],
  'rally.hint': ['Right-click the ground to set the rally point', 'برای تعیین نقطهٔ تجمع روی زمین کلیک راست کنید'],
  'why.bounds': ['Too close to the map edge', 'خیلی نزدیک به لبهٔ نقشه'], 'why.tech': ['Technology required', 'فناوری لازم است'], 'why.limit': ['Limit reached', 'به سقف مجاز رسیده'], 'why.terrain': ['Cannot build on this terrain', 'ساخت روی این زمین ممکن نیست'],
  'why.water': ['Cannot build on water', 'ساخت روی آب ممکن نیست'], 'why.node': ['Blocked by resources', 'منابع مانع‌اند'], 'why.occupied': ['Space occupied', 'محل اشغال است'], 'why.slope': ['Ground too steep', 'شیب زمین زیاد است'],
  'why.nores': ['Needs resources nearby', 'به منابع در نزدیکی نیاز دارد'], 'why.territory': ['Outside your territory', 'خارج از قلمرو شما'], 'why.cost': ['Not enough resources', 'منابع کافی نیست'], 'why.unknown': ['Cannot build here', 'اینجا قابل ساخت نیست'],
  // tech
  'tech.title': ['Technology tree', 'درخت فناوری'], 'tech.tier': ['Tier {n}', 'رده {n}'], 'tech.researched': ['Researched', 'پژوهش‌شده'], 'tech.researching': ['Researching…', 'در حال پژوهش…'], 'tech.needs': ['Requires: {t}', 'نیازمند: {t}'], 'tech.unlocks': ['Unlocks: {t}', 'باز می‌کند: {t}'],
  'tech.build': ['Needs a {b} to research', 'برای پژوهش به {b} نیاز دارد'], 'tech.eco': ['Economy', 'اقتصاد'], 'tech.mil': ['Military', 'نظامی'],
  'fx.gather': ['Gathering speed', 'سرعت جمع‌آوری'], 'fx.farm': ['Farm yield', 'بازده کشاورزی'], 'fx.tax': ['Tax income', 'درآمد مالیات'], 'fx.fee': ['Market fee', 'کارمزد بازار'], 'fx.store': ['Storage', 'ظرفیت انبار'], 'fx.wallHp': ['Wall & tower health', 'استحکام دیوار و برج'],
  'fx.build': ['Build speed', 'سرعت ساخت'], 'fx.gateHp': ['Gate health', 'استحکام دروازه'], 'fx.towerDmg': ['Tower damage', 'آسیب برج‌ها'], 'fx.siegeDmg': ['Siege damage', 'آسیب ادوات محاصره'], 'fx.atk': ['Melee attack', 'حملهٔ نزدیک'],
  'fx.def': ['Armor', 'زره'], 'fx.rdmg': ['Ranged damage', 'آسیب تیراندازان'], 'fx.rrange': ['Ranged range', 'برد تیراندازان'], 'fx.cav': ['Cavalry attack', 'حملهٔ سواره‌نظام'], 'fx.train': ['Training speed', 'سرعت آموزش'], 'fx.block': ['Block chance', 'شانس دفاع با سپر'],
  // notifications
  'n.attack': ['We are under attack!', 'مورد حمله قرار گرفته‌ایم!'], 'n.built': ['{b} completed', '{b} ساخته شد'], 'n.captured': ['Building captured!', 'ساختمان تصرف شد!'], 'n.leaving': ['Unhappy villagers are leaving!', 'روستاییان ناراضی در حال ترک‌اند!'],
  'n.lostbuilding': ['{b} destroyed!', '{b} نابود شد!'], 'n.lostcastle': ['Our castle was captured!', 'قلعهٔ ما تصرف شد!'], 'n.nodrop': ['Workers cannot reach a drop-off point', 'کارگران به محل تحویل دسترسی ندارند'], 'n.norepair': ['Not enough wood or stone to repair', 'چوب یا سنگ کافی برای تعمیر نیست'],
  'n.nores': ['{b}: no resources left nearby', '{b}: منبعی در نزدیکی نمانده'], 'n.objdone': ['Objective complete: {o}', 'هدف انجام شد: {o}'], 'n.popfull': ['Housing is full – build more houses', 'مسکن پر است – خانهٔ بیشتری بسازید'],
  'n.retreat': ['{name}\'s army is retreating', 'ارتش {name} عقب‌نشینی می‌کند'], 'n.starving': ['Your people are starving!', 'مردم شما گرسنه‌اند!'], 'n.storefull': ['Storage is full', 'انبار پر است'], 'n.teamdefeated': ['{name} has been defeated', '{name} شکست خورد'],
  'n.techdone': ['Research complete: {tech}', 'پژوهش کامل شد: {tech}'], 'n.unpaid': ['Treasury is empty – upkeep unpaid', 'خزانه خالی است – هزینه‌ها پرداخت نشد'], 'n.upgraded': ['{b} upgraded to level {l}', '{b} به سطح {l} ارتقا یافت'], 'n.wave': ['{name} is sending an army!', '{name} ارتشی می‌فرستد!'],
  'n.saved': ['Game saved', 'بازی ذخیره شد'], 'n.loaded': ['Game loaded', 'بازی بارگذاری شد'], 'n.autosaved': ['Autosaved', 'ذخیرهٔ خودکار انجام شد'], 'n.saveFail': ['Could not save the game', 'ذخیرهٔ بازی ناموفق بود'], 'n.groupSet': ['Group {n} saved', 'گروه {n} ذخیره شد'],
  'n.noMarket': ['Build a market to trade', 'برای تجارت بازار بسازید'], 'n.speed': ['Game speed ×{n}', 'سرعت بازی ×{n}'],
  // market
  'mk.title': ['Marketplace', 'بازار'], 'mk.buy': ['Buy', 'خرید'], 'mk.sell': ['Sell', 'فروش'], 'mk.price': ['Price', 'قیمت'], 'mk.fee': ['Fee {n}%', 'کارمزد {n}٪'], 'mk.hint': ['Trade resources for gold at the market.', 'منابع را در بازار با طلا معامله کنید.'], 'mk.need': ['Build a market first.', 'ابتدا بازار بسازید.'],
  // save/load
  'sv.title': ['Save game', 'ذخیرهٔ بازی'], 'ld.title': ['Load game', 'بارگذاری بازی'], 'sv.slot': ['Slot {n}', 'خانهٔ {n}'], 'sv.overwrite': ['Overwrite this slot?', 'این خانه بازنویسی شود؟'], 'sv.corrupt': ['This save file is damaged.', 'فایل ذخیره آسیب دیده است.'],
  'sv.newer': ['This save was made by a newer version.', 'این ذخیره با نسخهٔ جدیدتری ساخته شده است.'], 'sv.confirmDel': ['Delete this save?', 'این ذخیره حذف شود؟'], 'sv.meta': ['{mode} · {map} · {time}', '{mode} · {map} · {time}'],
  'mode.skirmish': ['Skirmish', 'نبرد آزاد'], 'mode.free': ['Free Build', 'ساخت آزاد'], 'mode.campaign': ['Campaign', 'کمپین'], 'mode.custom': ['Custom Battle', 'نبرد سفارشی'],
  // settings
  'st.title': ['Settings', 'تنظیمات'], 'st.tab.game': ['Gameplay', 'بازی'], 'st.tab.gfx': ['Graphics', 'گرافیک'], 'st.tab.audio': ['Audio', 'صدا'], 'st.tab.keys': ['Controls', 'کنترل‌ها'],
  'st.lang': ['Language', 'زبان'], 'st.quality': ['Graphics quality', 'کیفیت گرافیک'], 'st.shadows': ['Shadows', 'سایه‌ها'], 'st.aa': ['Anti-aliasing (restart to apply)', 'ضدلبه‌پری (با راه‌اندازی مجدد)'], 'st.fullscreen': ['Fullscreen', 'تمام‌صفحه'],
  'st.resolution': ['Window resolution', 'وضوح پنجره'], 'st.fps': ['FPS limit', 'محدودیت فریم'], 'st.unlimited': ['Unlimited', 'نامحدود'], 'st.weather': ['Weather effects', 'جلوه‌های آب‌وهوا'], 'st.daynight': ['Day / night cycle', 'چرخهٔ شب و روز'],
  'st.showfps': ['Show FPS', 'نمایش فریم'], 'st.vol.master': ['Master volume', 'صدای کلی'], 'st.vol.music': ['Music volume', 'صدای موسیقی'], 'st.vol.sfx': ['Effects volume', 'صدای جلوه‌ها'], 'st.vol.ambient': ['Ambient volume', 'صدای محیط'],
  'st.edge': ['Edge scrolling', 'پیمایش با لبهٔ صفحه'], 'st.camspeed': ['Camera speed', 'سرعت دوربین'], 'st.rotspeed': ['Rotation speed', 'سرعت چرخش'], 'st.zoomspeed': ['Zoom speed', 'سرعت زوم'], 'st.tooltips': ['Tooltips', 'راهنمای شناور'],
  'st.autosave': ['Autosave every (minutes, 0 = off)', 'ذخیرهٔ خودکار هر (دقیقه، ۰ = خاموش)'], 'st.press': ['Press a key…', 'یک کلید بزنید…'], 'st.keyhint': ['Click an action, then press the new key. Esc cancels.', 'روی یک عمل کلیک کنید و کلید جدید را بزنید. Esc لغو می‌کند.'],
  'st.fixedKeys': ['Fixed controls: Left click select · Right click command · Middle drag rotate · Wheel zoom · Ctrl+1-9 save group · 1-9 select group · Shift add to selection · Double-click select same type', 'کنترل‌های ثابت: کلیک چپ انتخاب · کلیک راست فرمان · کشیدن دکمهٔ وسط چرخش · چرخ ماوس زوم · Ctrl+۱-۹ ذخیرهٔ گروه · ۱-۹ انتخاب گروه · Shift افزودن به انتخاب · دوبار کلیک انتخاب هم‌نوع'],
  'k.camUp': ['Camera up', 'دوربین به جلو'], 'k.camDown': ['Camera down', 'دوربین به عقب'], 'k.camLeft': ['Camera left', 'دوربین چپ'], 'k.camRight': ['Camera right', 'دوربین راست'], 'k.rotLeft': ['Rotate left', 'چرخش به چپ'], 'k.rotRight': ['Rotate right', 'چرخش به راست'],
  'k.zoomIn': ['Zoom in', 'نزدیک‌تر'], 'k.zoomOut': ['Zoom out', 'دورتر'], 'k.focus': ['Focus on selection', 'تمرکز روی انتخاب'], 'k.pause': ['Pause menu', 'منوی توقف'], 'k.stop': ['Stop', 'توقف'], 'k.patrol': ['Patrol', 'گشت‌زنی'],
  'k.attackMove': ['Attack-move', 'حرکت و حمله'], 'k.garrison': ['Garrison', 'استقرار در برج'], 'k.retreat': ['Retreat', 'عقب‌نشینی'], 'k.rotateBuilding': ['Rotate building', 'چرخش ساختمان'], 'k.formation': ['Cycle formation', 'تغییر آرایش'], 'k.stance': ['Cycle stance', 'تغییر حالت رزم'],
  'k.selectArmy': ['Select all soldiers', 'انتخاب همهٔ سربازان'], 'k.selectIdle': ['Select idle villagers', 'انتخاب روستاییان بیکار'], 'k.demolish': ['Demolish', 'تخریب'], 'k.speedUp': ['Faster', 'سریع‌تر'], 'k.speedDown': ['Slower', 'کندتر'],
  'k.panelBuild': ['Construction panel', 'پنل ساخت‌وساز'], 'k.panelArmy': ['Army panel', 'پنل ارتش'], 'k.panelTech': ['Technology panel', 'پنل فناوری'], 'k.panelKingdom': ['Kingdom panel', 'پنل پادشاهی'], 'k.nextAlert': ['Jump to last alert', 'رفتن به آخرین هشدار'],
  'k.quickSave': ['Quick save', 'ذخیرهٔ سریع'], 'k.quickLoad': ['Quick load', 'بارگذاری سریع'],
  // credits
  'cr.title': ['Credits', 'سازندگان'], 'cr.design': ['Game design, programming, art direction, audio', 'طراحی بازی، برنامه‌نویسی، هدایت هنری، صدا'], 'cr.assets': ['All 3D models, textures, music and sound effects are generated procedurally in code. No third-party artwork or audio is used.', 'تمام مدل‌های سه‌بعدی، بافت‌ها، موسیقی و جلوه‌های صوتی به‌صورت رویه‌ای با کد ساخته شده‌اند. هیچ اثر هنری یا صوتی شخص ثالثی استفاده نشده است.'],
  'cr.tech': ['Built with Electron and three.js (MIT). Fonts: Cinzel, MedievalSharp, Vazirmatn (SIL Open Font License).', 'ساخته‌شده با Electron و three.js (MIT). فونت‌ها: Cinzel، MedievalSharp، Vazirmatn (SIL OFL).'], 'cr.thanks': ['Thank you for playing.', 'از اینکه بازی کردید سپاسگزاریم.'],
  // errors
  'loading': ['Loading…', 'در حال بارگذاری…'], 'loading.map': ['Generating the realm…', 'در حال ساخت قلمرو…'],
  'err.load': ['Could not load the game.', 'بارگذاری بازی ناموفق بود.'], 'err.gl': ['Your system could not start the 3D renderer (WebGL).', 'سیستم شما نتوانست رندر سه‌بعدی (WebGL) را راه‌اندازی کند.'],
  'conf.exit': ['Exit the game?', 'از بازی خارج می‌شوید؟'],
  'tip.rclick': ['Right-click to command your units', 'برای فرمان به واحدها کلیک راست کنید'],
  'help.title': ['Quick help', 'راهنمای سریع'],
  'help.body': ['Build houses, farms and a woodcutter to grow your village. Train soldiers in barracks. Select units with the left mouse button and right-click to move or attack. Capture the enemy capital to win.', 'خانه، مزرعه و چوب‌بری بسازید تا روستایتان رشد کند. در سربازخانه سرباز آموزش دهید. با دکمهٔ چپ واحدها را انتخاب و با کلیک راست حرکت یا حمله دهید. پایتخت دشمن را بگیرید تا پیروز شوید.'],
};

const B = {
  house: ['House', 'خانه', 'Shelters six villagers. More housing lets your kingdom grow.', 'شش روستایی را جا می‌دهد. مسکن بیشتر یعنی رشد پادشاهی.'],
  farm: ['Farm', 'مزرعه', 'Farmers produce food. Place near the town for safety.', 'کشاورزان غذا تولید می‌کنند.'],
  wheatfield: ['Wheat Field', 'گندم‌زار', 'Grows wheat for the mill. Workers walk across it.', 'گندم برای آسیاب می‌کارد. کارگران از رویش عبور می‌کنند.'],
  mill: ['Windmill', 'آسیاب بادی', 'Grinds wheat into flour.', 'گندم را به آرد تبدیل می‌کند.'],
  bakery: ['Bakery', 'نانوایی', 'Bakes flour into bread — the best food. Each bread feeds two.', 'آرد را به نان تبدیل می‌کند — بهترین غذا؛ هر نان دو وعده است.'],
  woodcutter: ['Woodcutter', 'چوب‌بری', 'Villagers fell nearby trees for wood.', 'روستاییان درختان اطراف را برای چوب قطع می‌کنند.'],
  quarry: ['Stone Quarry', 'معدن سنگ', 'Cuts stone from nearby rock deposits.', 'از ذخایر سنگ اطراف، سنگ می‌برد.'],
  mine: ['Mine', 'معدن', 'Digs iron ore and gold from nearby deposits.', 'آهن و طلا را از ذخایر اطراف استخراج می‌کند.'],
  market: ['Market', 'بازار', 'Trade resources for gold. Raises tax income.', 'منابع را با طلا معامله کنید. درآمد مالیات را بالا می‌برد.'],
  warehouse: ['Warehouse', 'انبار', 'Drop-off point and extra storage.', 'نقطهٔ تحویل منابع و ظرفیت انبار اضافه.'],
  hunter: ['Hunter\'s Hut', 'کلبهٔ شکارچی', 'Hunters bring venison from wild deer.', 'شکارچیان گوشت گوزن وحشی می‌آورند.'],
  barracks: ['Barracks', 'سربازخانه', 'Trains infantry: swordsmen, spearmen, shield bearers, heavy infantry and guards.', 'پیاده‌نظام آموزش می‌دهد.'],
  archery: ['Archery Range', 'میدان تیراندازی', 'Trains archers and crossbowmen.', 'کماندار و کمان‌گیر پولادی آموزش می‌دهد.'],
  stable: ['Stable', 'اصطبل', 'Trains light and heavy cavalry.', 'سواره‌نظام سبک و سنگین آموزش می‌دهد.'],
  blacksmith: ['Blacksmith', 'آهنگری', 'Research weapons, armor and military upgrades.', 'سلاح، زره و ارتقاهای نظامی را پژوهش کنید.'],
  siegeworks: ['Siege Workshop', 'کارگاه محاصره', 'Builds catapults, battering rams and siege towers.', 'منجنیق، قوچ و برج محاصره می‌سازد.'],
  training: ['Training Ground', 'میدان آموزش', 'Speeds up the training of all soldiers.', 'سرعت آموزش همهٔ سربازان را بالا می‌برد.'],
  wallw: ['Wooden Palisade', 'حصار چوبی', 'Cheap wall. Drag to build a line.', 'دیوار ارزان. برای ساخت ردیفی بکشید.'],
  walls: ['Stone Wall', 'دیوار سنگی', 'Strong wall; archers can man it. Drag to build a line.', 'دیوار محکم؛ کمانداران می‌توانند روی آن بایستند.'],
  gate: ['Gate', 'دروازه', 'Opens for your units, closes against enemies.', 'برای نیروهای شما باز و در برابر دشمن بسته می‌شود.'],
  rgate: ['Reinforced Gate', 'دروازهٔ تقویت‌شده', 'Iron-banded gate with much more health.', 'دروازهٔ آهن‌پوش با استحکام بسیار بیشتر.'],
  guardtower: ['Guard Tower', 'برج نگهبانی', 'Small tower. Garrison archers for extra range.', 'برج کوچک. کمانداران را برای برد بیشتر مستقر کنید.'],
  archertower: ['Archer Tower', 'برج کمانداران', 'Tall tower with strong ranged fire.', 'برج بلند با آتش تیراندازی قوی.'],
  deftower: ['Defence Tower', 'برج دفاعی', 'Massive tower with a bolt thrower.', 'برج عظیم با زوبین‌انداز.'],
  moat: ['Moat', 'خندق', 'Water-filled ditch. Impassable until bridged.', 'خندق پر از آب. تا پل نزنید عبورناپذیر است.'],
  bridge: ['Bridge', 'پل', 'Crosses rivers and moats.', 'از رودخانه و خندق عبور می‌دهد.'],
  keep: ['Keep', 'دژ', 'The heart of a kingdom: large territory, housing, and storage. Limit 3.', 'قلب پادشاهی: قلمرو بزرگ، مسکن و انبار. حداکثر ۳.'],
  townhall: ['Town Hall', 'تالار شهر', 'Your capital. Trains villagers and researches economy.', 'پایتخت شما. روستایی آموزش می‌دهد و فناوری اقتصادی را پژوهش می‌کند.'],
  treasury: ['Treasury', 'خزانه', 'Stores gold and boosts tax income.', 'طلا نگه می‌دارد و درآمد مالیات را افزایش می‌دهد.'],
  storage: ['Great Storehouse', 'انبار بزرگ', 'Greatly expands resource storage.', 'ظرفیت انبار منابع را بسیار بالا می‌برد.'],
  church: ['Church', 'کلیسا', 'Raises happiness across the kingdom.', 'رضایت مردم را در سراسر پادشاهی بالا می‌برد.'],
};
const U = {
  villager: ['Villager', 'روستایی', 'Builds, gathers and farms.', 'می‌سازد، جمع می‌کند و می‌کارد.'],
  sword: ['Swordsman', 'شمشیرزن', 'Reliable all-round infantry.', 'پیاده‌نظام همه‌فن‌حریف.'],
  heavy: ['Heavy Infantry', 'پیاده‌نظام سنگین', 'Plate-armored two-hander. Slow but deadly.', 'جنگجوی زره‌پوش با شمشیر دودستی؛ کند اما کشنده.'],
  shield: ['Shield Bearer', 'سپردار', 'Blocks blows and holds the line.', 'ضربات را دفع می‌کند و صف را نگه می‌دارد.'],
  spear: ['Spearman', 'نیزه‌دار', 'Strong against cavalry.', 'در برابر سواره‌نظام قوی است.'],
  guard: ['Royal Guard', 'نگهبان سلطنتی', 'Elite champion of the crown.', 'قهرمان نخبهٔ تاج و تخت.'],
  archer: ['Archer', 'کماندار', 'Long-range volleys. Weak in melee.', 'پرتاب تیر از دور. در نبرد تن‌به‌تن ضعیف.'],
  crossbow: ['Crossbowman', 'کمان‌گیر پولادی', 'Slow but armor-piercing bolts.', 'کند اما تیرهایش زره را می‌شکافد.'],
  lightcav: ['Light Cavalry', 'سواره‌نظام سبک', 'Fast raider with a charge bonus.', 'غارتگر تندرو با ضربهٔ یورش.'],
  heavycav: ['Heavy Cavalry', 'سواره‌نظام سنگین', 'Armored knights; devastating charge.', 'شوالیه‌های زره‌پوش؛ یورش ویرانگر.'],
  catapult: ['Catapult', 'منجنیق', 'Hurls boulders over walls. Splash damage.', 'سنگ‌های بزرگ را از روی دیوار پرتاب می‌کند؛ آسیب منطقه‌ای.'],
  ram: ['Battering Ram', 'قوچ کوبنده', 'Smashes gates and walls.', 'دروازه و دیوار را در هم می‌کوبد.'],
  siegetower: ['Siege Tower', 'برج محاصره', 'Carries soldiers over the walls.', 'سربازان را از روی دیوارها عبور می‌دهد.'],
};
const T = {
  tools1: ['Iron Tools I', 'ابزار آهنی ۱'], tools2: ['Iron Tools II', 'ابزار آهنی ۲'], plow1: ['Heavy Plow I', 'گاوآهن سنگین ۱'], plow2: ['Heavy Plow II', 'گاوآهن سنگین ۲'], taxes1: ['Tax Collectors', 'مأموران مالیات'],
  trade1: ['Trade Guilds', 'اصناف بازرگانی'], granary: ['Granaries', 'انبارهای غله'], masonry1: ['Masonry I', 'سنگ‌تراشی ۱'], masonry2: ['Masonry II', 'سنگ‌تراشی ۲'], rgates: ['Reinforced Gates', 'دروازه‌های تقویت‌شده'],
  bastions: ['Bastions', 'باروها'], engineering: ['Engineering', 'مهندسی'], siege2: ['Siege Craft', 'فن محاصره'], weapons1: ['Sharpened Blades I', 'تیغه‌های تیز ۱'], weapons2: ['Sharpened Blades II', 'تیغه‌های تیز ۲'],
  weapons3: ['Sharpened Blades III', 'تیغه‌های تیز ۳'], armor1: ['Mail Armor I', 'زره زنجیری ۱'], armor2: ['Mail Armor II', 'زره زنجیری ۲'], armor3: ['Mail Armor III', 'زره زنجیری ۳'], plate: ['Plate Armor', 'زره صفحه‌ای'],
  fletching: ['Fletching I', 'پرتراشی ۱'], fletching2: ['Fletching II', 'پرتراشی ۲'], crossbow: ['Crossbow Design', 'طراحی کمان پولادی'], horses1: ['Warhorse Breeding', 'پرورش اسب جنگی'], barding: ['Horse Barding', 'زره اسب'],
  royalguard: ['Royal Guard', 'نگهبان سلطنتی'], train1: ['Drill Sergeants I', 'سرگروهان آموزش ۱'], train2: ['Drill Sergeants II', 'سرگروهان آموزش ۲'], train3: ['Drill Sergeants III', 'سرگروهان آموزش ۳'], shieldwall: ['Shield Wall Doctrine', 'آموزهٔ دیوار سپر'],
};
for (const k in B) { D['b.' + k] = [B[k][0], B[k][1]]; D['bd.' + k] = [B[k][2], B[k][3]]; }
for (const k in U) { D['u.' + k] = [U[k][0], U[k][1]]; D['ud.' + k] = [U[k][2], U[k][3]]; }
for (const k in T) D['t.' + k] = T[k];
D['u.villager.pl'] = ['Villagers', 'روستاییان'];

export function lang() { return settings.lang === 'fa' ? 'fa' : 'en'; }
export function isRTL() { return lang() === 'fa'; }
const FAD = '۰۱۲۳۴۵۶۷۸۹';
export function num(n) { const s = String(n); return isRTL() ? s.replace(/[0-9]/g, (d) => FAD[+d]) : s; }
export function t(key, p) {
  const e = D[key];
  let s = e ? e[lang() === 'fa' ? 1 : 0] : key;
  if (p) s = s.replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? (typeof p[k] === 'number' ? num(p[k]) : p[k]) : m));
  else if (isRTL()) s = s; // keep as is
  return s;
}
export function has(key) { return key in D; }
export function fmtTimeL(sec) { sec = Math.max(0, Math.floor(sec)); const m = Math.floor(sec / 60), s = sec % 60; return num(m + ':' + String(s).padStart(2, '0')); }
