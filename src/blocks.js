// Block registry. Each block has stable numeric id, color, and metadata used by
// the renderer, physics, gameplay, and the education mode.
//
// Block ids must stay stable for save/load to work. Add new blocks at the end.

export const AIR = 0;

export const BLOCKS = [
  {
    id: 0,
    name: 'Воздух',
    color: 0x000000,
    transparent: true,
    solid: false,
    hardness: 0,
    edu: 'Воздух — пустое место в мире. Сквозь него можно проходить.'
  },
  {
    id: 1,
    name: 'Трава',
    color: 0x6db347,
    sideColor: 0x8a6a3b,
    bottomColor: 0x8a6a3b,
    hardness: 0.6,
    edu: 'Трава — верхний слой почвы. Растёт на дёрне и поддерживает деревья.'
  },
  {
    id: 2,
    name: 'Земля',
    color: 0x8a6a3b,
    hardness: 0.5,
    edu: 'Земля — рыхлый слой под травой. Из неё можно делать грядки.'
  },
  {
    id: 3,
    name: 'Камень',
    color: 0x8a8d92,
    hardness: 1.5,
    edu: 'Камень — основа земной коры. Из него добывают руды и строят прочные стены.'
  },
  {
    id: 4,
    name: 'Песок',
    color: 0xe8d8a0,
    hardness: 0.5,
    edu: 'Песок — мелкие частицы породы. Часто встречается у воды и в пустынях.'
  },
  {
    id: 5,
    name: 'Вода',
    color: 0x3a78c2,
    transparent: true,
    solid: false,
    hardness: 100,
    liquid: true,
    edu: 'Вода — жидкость, по которой можно плавать. Замедляет движение.'
  },
  {
    id: 6,
    name: 'Дерево (ствол)',
    color: 0x6f4a2a,
    sideColor: 0x6f4a2a,
    topColor: 0x9c7a4a,
    hardness: 1.0,
    edu: 'Ствол дерева — основной строительный материал. Распиливается на доски.'
  },
  {
    id: 7,
    name: 'Листья',
    color: 0x4f9a3b,
    transparent: true,
    solid: true,
    hardness: 0.2,
    edu: 'Листья — крона дерева. Без ствола рассыпаются со временем.'
  },
  {
    id: 8,
    name: 'Доски',
    color: 0xc89d61,
    hardness: 1.0,
    edu: 'Доски — обработанная древесина. Универсальный материал для построек.'
  },
  {
    id: 9,
    name: 'Кирпич',
    color: 0xa14a3a,
    hardness: 1.4,
    edu: 'Кирпич — обожжённая глина. Прочнее камня и красиво смотрится в стенах.'
  },
  {
    id: 10,
    name: 'Стекло',
    color: 0xbfe7ff,
    transparent: true,
    solid: true,
    opacity: 0.35,
    hardness: 0.3,
    edu: 'Стекло — прозрачный материал. Пропускает свет, но не воздух.'
  },
  {
    id: 11,
    name: 'Светящийся камень',
    color: 0xffd66b,
    emissive: 0xffaa33,
    hardness: 0.6,
    edu: 'Светящийся камень — естественный источник света для подземелий.'
  },
  {
    id: 12,
    name: 'Редстоун: источник',
    color: 0xff5252,
    emissive: 0xff2222,
    redstone: 'source',
    hardness: 0.6,
    edu: 'Источник питания. Нажмите R, чтобы включить или выключить сигнал.'
  },
  {
    id: 13,
    name: 'Редстоун: провод',
    color: 0x9a2222,
    redstone: 'wire',
    hardness: 0.4,
    edu: 'Редстоун-провод передаёт сигнал между источниками и устройствами.'
  },
  {
    id: 14,
    name: 'Редстоун: лампа (выкл)',
    color: 0x4a3a2a,
    redstone: 'lamp_off',
    hardness: 0.6,
    edu: 'Лампа загорается, если рядом есть редстоун-сигнал.'
  },
  {
    id: 15,
    name: 'Редстоун: лампа (вкл)',
    color: 0xfff1a8,
    emissive: 0xffd866,
    redstone: 'lamp_on',
    hardness: 0.6,
    edu: 'Лампа горит — на неё подан сигнал от провода или источника.'
  }
];

// Slots shown in the hotbar. Order matters: keys 1..9.
export const HOTBAR = [1, 8, 3, 4, 9, 10, 11, 12, 13];

export function getBlock(id) {
  return BLOCKS[id] || BLOCKS[0];
}

export function isSolid(id) {
  const b = BLOCKS[id];
  return !!(b && b.solid !== false && id !== AIR);
}

export function isTransparent(id) {
  const b = BLOCKS[id];
  return !!(b && b.transparent);
}

export function isLiquid(id) {
  return !!BLOCKS[id]?.liquid;
}

// Returns the color of a block on a given face direction.
// face: 'top' | 'bottom' | 'side'
export function faceColor(id, face) {
  const b = BLOCKS[id];
  if (!b) return 0xff00ff;
  if (face === 'top' && b.topColor !== undefined) return b.topColor;
  if (face === 'bottom' && b.bottomColor !== undefined) return b.bottomColor;
  if (face !== 'top' && face !== 'bottom' && b.sideColor !== undefined) return b.sideColor;
  return b.color;
}
