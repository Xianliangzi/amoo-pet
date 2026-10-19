import type { Behavior, PetRecord, PetState } from './pet';
import { event, remember } from './memory';
import type { SensorReading } from './sensors';

export type Intent = 'feed' | 'play' | 'sleep' | 'wake' | 'status' | 'happy' | 'swim' | 'memory';
export function parseIntent(text: string): Intent | undefined {
  const t = text.trim();
  // Refuse negated and compound instructions rather than silently performing one.
  if (/不|别|不要|然后|再|同时|并且/.test(t)) return;
  if (/记忆|记得|记住|回忆/.test(t)) return 'memory';
  const candidates: Intent[] = [];
  if (/喂|吃饭|吃东西/.test(t)) candidates.push('feed');
  if (/玩|陪它/.test(t)) candidates.push('play');
  if (/睡/.test(t)) candidates.push('sleep');
  if (/醒/.test(t)) candidates.push('wake');
  if (/怎么样|状态|如何/.test(t)) candidates.push('status');
  if (/开心|高兴/.test(t)) candidates.push('happy');
  if (/游/.test(t)) candidates.push('swim');
  return candidates.length === 1 ? candidates[0] : undefined;
}
export interface DeviceAdapter { playAnimation(behavior: Behavior): void }
export class VirtualDeviceAdapter implements DeviceAdapter {
  constructor(private display: (behavior: Behavior) => void) {}
  playAnimation(behavior: Behavior) { this.display(behavior); }
}
const clamp = (v: number) => Math.max(0, Math.min(100, v));
export class PetEngine {
  constructor(private read: () => PetRecord | undefined, private write: (pet: PetRecord) => Promise<void>, private device: DeviceAdapter) {}
  getPetContext() { const pet = this.read(); return pet ? { profile: { ...pet.profile }, state: { ...pet.state }, recentEvents: pet.events.slice(-10).reverse(), relevantMemories: [...pet.memories].sort((a, b) => b.importance - a.importance) } : undefined; }
  private async update(behavior: Behavior, delta: Partial<Record<'satiety' | 'energy' | 'mood' | 'bond', number>> = {}, type: string = behavior, animate = true) {
    const pet = this.read(); if (!pet) throw Error('请先创建 Amoo。');
    const state: PetState = { ...pet.state, currentBehavior: behavior, updatedAt: Date.now() };
    for (const key of ['satiety', 'energy', 'mood', 'bond'] as const) state[key] = clamp(state[key] + (delta[key] ?? 0));
    const added = event(type, { behavior, delta });
    const events = [...pet.events, added];
    await this.write({ ...pet, state, events, memories: remember(events, pet.memories, added) });
    if (animate || behavior !== pet.state.currentBehavior) this.device.playAnimation(behavior);
  }
  async execute(intent: Intent, say: (message: string) => void) {
    const context = this.getPetContext(); if (!context) throw Error('请先创建 Amoo。');
    if (intent === 'memory') { say(context.relevantMemories.map(m => m.content).join(' ')); return; }
    if (intent === 'status') { const s = context.state; say(`${context.profile.name}：饱腹度 ${s.satiety}，精力 ${s.energy}，心情 ${s.mood}，亲密度 ${s.bond}。${s.currentBehavior === 'sleep' ? '正在睡觉。' : '现在醒着。'}`); return; }
    if (context.state.currentBehavior === 'sleep' && intent !== 'sleep' && intent !== 'wake') {
      await this.update('idle', {}, 'wake'); say('Amoo 醒来了，接下来回应你的指令。');
      await new Promise(resolve => setTimeout(resolve, 900));
    }
    switch (intent) {
      case 'feed': await this.update('eat', { satiety: 30, mood: 5, bond: 2 }, 'feed'); say('Amoo 开始吃饭了，饱腹度增加了。'); break;
      case 'play': await this.update('play', { energy: -15, mood: 15, bond: 5 }); say('Amoo 正在陪你玩，心情和亲密度增加了。'); break;
      case 'sleep': await this.update('sleep'); say('Amoo 睡着了。需要互动时，我会先叫醒它。'); break;
      case 'wake': await this.update('idle', {}, 'wake'); say('Amoo 已经醒来。'); break;
      case 'happy': await this.update('happy'); say('Amoo 开心地回应了你。'); break;
      case 'swim': await this.update('swim'); say('Amoo 开始游动了。'); break;
    }
  }
  async complete(behavior: Behavior) {
    if (['eat', 'play', 'happy'].includes(behavior) && this.read()?.state.currentBehavior === behavior) {
      if (this.read()!.state.energy <= 15) await this.update('sleep', {}, 'auto_sleep');
      else await this.update('idle', {}, 'action_complete');
    }
  }
  async tick() {
    const pet = this.read(); if (!pet) return;
    const behavior = pet.state.currentBehavior;
    const sleeping = behavior === 'sleep';
    const delta = { satiety: -1, energy: sleeping ? 3 : -1 };
    // One visible minute per call, with no catch-up based on persisted timestamps.
    if (!sleeping && pet.state.energy - 1 <= 15 && !['eat', 'play', 'happy'].includes(behavior)) {
      await this.update('sleep', delta, 'auto_sleep');
    } else if (behavior === 'idle' || behavior === 'swim') {
      await this.update(behavior === 'idle' ? 'swim' : 'idle', delta, 'autonomous');
    } else await this.update(behavior, delta, 'tick', false);
  }
  async sense(previous: SensorReading, next: SensorReading) {
    const pet = this.read(); if (!pet) return;
    if (previous.light !== next.light && next.light === 'dark') {
      if (pet.state.currentBehavior !== 'sleep') await this.update('sleep', {}, 'sensor_dark');
    } else if (previous.distance !== next.distance && next.distance === 'near') {
      // Sleeping pets stay asleep; proximity never overrides darkness or rest.
      if (pet.state.currentBehavior !== 'sleep' && next.light !== 'dark') await this.update('happy', { bond: 1 }, 'sensor_near');
    }
  }
  async restore() {
    const pet = this.read(); if (!pet) return;
    if (['eat', 'play', 'happy'].includes(pet.state.currentBehavior)) await this.update('idle', {}, 'restored');
    else this.device.playAnimation(pet.state.currentBehavior);
  }
}
