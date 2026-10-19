import type { PetProfile } from './pet';

export type PetEvent = { id: string; type: string; timestamp: number; payload?: Record<string, unknown> };
export type PetMemory = { id: string; type: 'milestone' | 'preference'; content: string; importance: number; createdAt: number };
export const event = (type: string, payload?: Record<string, unknown>): PetEvent => ({ id: crypto.randomUUID(), type, timestamp: Date.now(), payload });
export function foundation(profile: PetProfile) {
  return {
    events: ['created', 'named'].map(type => ({ id: `${profile.petId}:${type}`, type, timestamp: profile.birthday, payload: { name: profile.name } })),
    memories: [
      { id: 'created', type: 'milestone' as const, content: '我记得我们第一次见面的日子。', importance: 100, createdAt: profile.birthday },
      { id: 'named', type: 'milestone' as const, content: `你给我取名叫「${profile.name}」。`, importance: 100, createdAt: profile.birthday },
    ],
  };
}
const periods = ['凌晨（00–06 点）', '早上（06–12 点）', '下午（12–18 点）', '晚上（18–24 点）'];
const period = (timestamp: number) => Math.floor(Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', hourCycle: 'h23' }).format(timestamp)) / 6);
export function remember(events: PetEvent[], existing: PetMemory[], added: PetEvent): PetMemory[] {
  const memories = [...existing];
  const first = added.type === 'feed' ? ['first_feed', '我记得你第一次喂我吃饭。'] : added.type === 'play' ? ['first_play', '我记得你第一次陪我玩。'] : undefined;
  if (first && !memories.some(m => m.id === first[0])) memories.push({ id: first[0], type: 'milestone', content: first[1], importance: 90, createdAt: added.timestamp });
  if (added.type === 'play') {
    const plays = events.filter(e => e.type === 'play').slice(-7);
    if (plays.length === 7) {
      const counts = [0, 0, 0, 0]; plays.forEach(e => counts[period(e.timestamp)]++);
      const best = counts.findIndex(n => n >= 5);
      if (best >= 0) {
        const id = `play_period_${best}`;
        const content = `我发现你常在${periods[best]}陪我玩：最近一次形成这条记忆时，7 次陪玩中有 ${counts[best]} 次在这个时段。`;
        const previous = memories.find(m => m.id === id);
        const memory: PetMemory = { id, type: 'preference', content, importance: 70, createdAt: previous?.createdAt ?? added.timestamp };
        if (previous) memories[memories.indexOf(previous)] = memory; else memories.push(memory);
      }
    }
  }
  return memories;
}
export const eventLabels: Record<string, string> = { tick: '在线状态变化', autonomous: '自主游动 / 休息', auto_sleep: '低精力自动入睡', sensor_dark: '环境变暗入睡', sensor_near: '回应靠近', created: '初次见面', named: '获得名字', feed: '喂食', play: '陪玩', sleep: '入睡', wake: '唤醒', happy: '开心回应', swim: '游动', action_complete: '动作结束', restored: '恢复待机' };
