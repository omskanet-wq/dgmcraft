// Tiny manual i18n. We default to Russian per the user's request and keep
// English keys around so it's easy to swap locales later via a setting.

export type Locale = 'ru' | 'en';

let current: Locale = 'ru';

export function setLocale(l: Locale): void { current = l; }
export function getLocale(): Locale { return current; }

const STRINGS: Record<string, Record<Locale, string>> = {
  // Survival meters
  'meter.hp': { ru: 'ЗДОРОВЬЕ', en: 'HP' },
  'meter.hunger': { ru: 'ГОЛОД', en: 'HUNGER' },
  'meter.thirst': { ru: 'ЖАЖДА', en: 'THIRST' },
  'meter.stamina': { ru: 'ВЫНОСЛИВ.', en: 'STAMINA' },
  // Time
  'time.day': { ru: 'ДЕНЬ', en: 'DAY' },
  'time.dayfall': { ru: 'Ночь близко — выходи', en: 'Dawn breaks — push out.' },
  'time.nightfall': { ru: 'Темнеет — они просыпаются', en: 'Night falls — they wake up.' },
  // HUD buttons
  'btn.bag': { ru: 'Сумка (I)', en: 'Bag (I)' },
  'btn.craft': { ru: 'Крафт (C)', en: 'Craft (C)' },
  'btn.bastion': { ru: 'Бастион (B)', en: 'Bastion (B)' },
  'btn.city': { ru: 'Город (B)', en: 'City (B)' },
  'btn.tasks': { ru: 'Задачи', en: 'Tasks' },
  'btn.settings': { ru: 'Настройки', en: 'Settings' },
  'btn.menu': { ru: 'Меню', en: 'Menu' },
  'btn.close': { ru: 'Закрыть', en: 'Close' },
  'btn.claim': { ru: 'Забрать', en: 'Claim' },
  'btn.save_now': { ru: 'Сохранить', en: 'Save now' },
  'btn.clear_save': { ru: 'Стереть', en: 'Clear save' },
  'btn.continue': { ru: 'Продолжить', en: 'Continue' },
  'btn.new_game': { ru: 'Новая игра', en: 'New game' },
  'btn.start': { ru: 'Начать', en: 'Start' },
  // Combat
  'combat.unarmed': { ru: 'Без оружия', en: 'Unarmed' },
  'combat.find_weapon': { ru: 'Найди оружие', en: 'Find a weapon.' },
  'combat.dmg': { ru: 'УР', en: 'DMG' },
  'combat.range': { ru: 'РАД', en: 'RNG' },
  'combat.ranged': { ru: 'ДАЛЬНОБОЙ', en: 'RANGED' },
  'combat.combo': { ru: 'Комбо', en: 'Combo' },
  // Settings
  'settings.title': { ru: 'Настройки', en: 'Settings' },
  'settings.master_volume': { ru: 'Общая громкость', en: 'Master volume' },
  'settings.mute': { ru: 'Без звука', en: 'Mute' },
  'settings.quality': { ru: 'Качество графики', en: 'Quality preset' },
  'settings.quality_hint': { ru: 'Качество применится при перезаходе в сцену.', en: 'Quality changes apply on the next scene load.' },
  'settings.show_fps': { ru: 'Показывать FPS', en: 'Show FPS counter' },
  'settings.save_slot': { ru: 'Сохранение', en: 'Save slot' },
  'settings.autosave_hint': { ru: 'Игра автоматически сохраняется каждые 30 секунд.', en: 'The game also autosaves every 30 seconds.' },
  'settings.language': { ru: 'Язык', en: 'Language' },
  'settings.q.low': { ru: 'низкое', en: 'low' },
  'settings.q.medium': { ru: 'среднее', en: 'medium' },
  'settings.q.high': { ru: 'высокое', en: 'high' },
  // Quests
  'quests.title': { ru: 'Задачи', en: 'Objectives' },
  'quests.claimed': { ru: 'Получено', en: 'Claimed' },
  'quests.reward': { ru: 'Награда:', en: 'Reward:' },
  // Quest defs
  'q.first_blood.title': { ru: 'Первая кровь', en: 'First Blood' },
  'q.first_blood.desc': { ru: 'Уложи 5 ходячих — нарушь тишину.', en: 'Drop 5 walkers — break the silence.' },
  'q.scavenger.title': { ru: 'Мародёр', en: 'Scavenger' },
  'q.scavenger.desc': { ru: 'Вскрой 6 контейнеров в городе.', en: 'Crack open 6 containers in the city.' },
  'q.cleanser.title': { ru: 'Очиститель', en: 'Cleanser' },
  'q.cleanser.desc': { ru: 'Уложи 25 мертвецов.', en: 'Put down 25 of the dead.' },
  'q.survivor.title': { ru: 'Выживший', en: 'Survivor' },
  'q.survivor.desc': { ru: 'Переживи 3 ночи.', en: 'Outlast 3 nights.' },
  'q.foreman.title': { ru: 'Прораб', en: 'Foreman' },
  'q.foreman.desc': { ru: 'Построй 4 здания в Бастионе.', en: 'Place 4 buildings in your Bastion.' },
  // Toasts
  'toast.placed': { ru: 'Установлено: {name}', en: '{name} placed.' },
  'toast.missing_materials': { ru: 'Не хватает материалов.', en: 'Missing materials.' },
  'toast.tile_occupied': { ru: 'Место занято.', en: 'Tile is occupied.' },
  'toast.save_cleared': { ru: 'Сохранение стёрто.', en: 'Save cleared.' },
  'toast.quest_complete': { ru: 'Задача выполнена: {title}', en: 'Quest complete: {title}' },
  'toast.reward_claimed': { ru: 'Награда получена: {title}', en: 'Reward claimed: {title}' },
  // Menu
  'menu.title': { ru: 'Afterfall: Бастион', en: 'Afterfall: Bastion' },
  'menu.subtitle': { ru: 'Выживай, строй, сражайся', en: 'Survive, build, fight' },
  'menu.has_save': { ru: 'Найдено сохранение', en: 'Save detected' },
};

export function t(key: string, vars?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  const raw = entry[current] ?? entry.en ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
