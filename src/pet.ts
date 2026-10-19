import Dexie, { type EntityTable } from 'dexie';
import { create } from 'zustand';
import { PetEngine, VirtualDeviceAdapter, parseIntent } from './engine';
import { foundation, type PetEvent, type PetMemory } from './memory';
import { VirtualSensorAdapter, type SensorReading } from './sensors';

export type Behavior = 'idle' | 'swim' | 'eat' | 'play' | 'happy' | 'sleep';
export type PetProfile = { petId: string; name: string; birthday: number };
export type PetState = { satiety: number; energy: number; mood: number; bond: number; currentBehavior: Behavior; updatedAt: number };
export type PetRecord = { key: 'primary'; profile: PetProfile; state: PetState; events: PetEvent[]; memories: PetMemory[] };

const db = new Dexie('amoo-desktop-p0') as Dexie & { pets: EntityTable<PetRecord, 'key'> };
db.version(1).stores({ pets: 'key' });
db.version(2).stores({ pets: 'key' }).upgrade(tx => tx.table('pets').toCollection().modify(pet => {
  // Only reconstruct facts present in the existing identity, never invent old interactions.
  const initial = foundation(pet.profile);
  pet.events ??= initial.events;
  pet.memories ??= initial.memories;
}));

// The repository stores identity and state together in one atomic IndexedDB record.
const repository = {
  load: () => db.pets.get('primary'),
  create: (pet: PetRecord) => db.transaction('rw', db.pets, async () => {
    const existing = await db.pets.get('primary');
    if (existing) return existing;
    await db.pets.add(pet);
    return pet;
  }),
};

type Message = { role: 'user' | 'amoo'; text: string };
type Store = { pet?: PetRecord; loading: boolean; saving: boolean; error: string; busy: boolean; display: Behavior; animationId: number; messages: Message[]; sensors: SensorReading; tick: () => Promise<void>; setSensors: (reading: SensorReading) => Promise<void>; send: (text: string) => Promise<void>; complete: (behavior: Behavior, animationId: number) => Promise<void>; initialize: () => Promise<void>; createPet: (name: string) => Promise<void> };
let initialization: Promise<void> | undefined;
let engine: PetEngine;
const sensorAdapter = new VirtualSensorAdapter();
export const usePetStore = create<Store>((set, get) => ({
  loading: true, saving: false, error: '', busy: false, display: 'idle', animationId: 0, messages: [],
  sensors: sensorAdapter.read(),
  tick: async () => {
    if (get().busy || get().loading || !get().pet) return;
    set({ busy: true });
    try { await engine.tick(); } catch { set({ error: '在线状态更新保存失败，请检查存储后重试。' }); }
    finally { set({ busy: false }); }
  },
  setSensors: async reading => {
    if (get().busy || get().loading || !get().pet) return;
    set({ busy: true });
    try { await engine.sense(sensorAdapter.read(), reading); sensorAdapter.set(reading); set({ sensors: reading, error: '' }); }
    catch { set({ error: '传感器响应保存失败，请重试。' }); }
    finally { set({ busy: false }); }
  },
  send: async text => {
    if (get().busy || !text.trim()) return;
    const say = (text: string) => set(s => ({ messages: [...s.messages, { role: 'amoo' as const, text }].slice(-40) }));
    set(s => ({ messages: [...s.messages, { role: 'user' as const, text: text.trim() }].slice(-40), error: '' }));
    const intent = parseIntent(text);
    if (!intent) { say('请一次发送一个明确指令：喂它、陪它玩、睡觉、醒来、游动、开心，或查询状态、你记得什么。暂不支持否定和组合指令。'); return; }
    set({ busy: true });
    try { await engine.execute(intent, say); }
    catch { set({ error: '指令未完成：请检查本地存储是否可用后重试。' }); say('这次操作未完成，请重试。'); }
    finally { set({ busy: false }); }
  },
  complete: async (behavior, animationId) => {
    if (get().busy || animationId !== get().animationId) return;
    set({ busy: true });
    try { await engine.complete(behavior); } catch { set({ error: '动作结束后的状态保存失败，请刷新后重试。' }); }
    finally { set({ busy: false }); }
  },
  initialize: () => {
    if (!initialization) initialization = (async () => {
      try { set({ pet: await repository.load(), error: '' }); await engine.restore(); set({ loading: false }); }
      catch { set({ loading: false, error: '无法读取本地数据，请检查浏览器是否允许使用 IndexedDB，然后重试。' }); initialization = undefined; }
    })();
    return initialization;
  },
  createPet: async (name) => {
    if (get().saving || get().pet) return;
    const cleanName = name.trim();
    if (!cleanName || cleanName.length > 20) { set({ error: '请输入 1–20 个字符的名字。' }); return; }
    set({ saving: true, error: '' });
    const now = Date.now();
    try {
      const profile = { petId: crypto.randomUUID(), name: cleanName, birthday: now };
      const pet = await repository.create({ key: 'primary', profile, state: { satiety: 70, energy: 80, mood: 75, bond: 0, currentBehavior: 'idle', updatedAt: now }, ...foundation(profile) });
      set({ pet, saving: false });
    } catch { set({ saving: false, error: '保存失败，尚未创建宠物。请检查浏览器存储权限后重试。' }); }
  },
}));
engine = new PetEngine(
  () => usePetStore.getState().pet,
  async pet => { await db.pets.put(pet); usePetStore.setState({ pet }); },
  new VirtualDeviceAdapter(display => usePetStore.setState(s => ({ display, animationId: s.animationId + 1 }))),
);
