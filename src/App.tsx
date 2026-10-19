import { useEffect, useState } from 'react';
import { usePetStore, type Behavior } from './pet';
import { eventLabels } from './memory';

const clips: { id: Behavior; name: string; mode: string }[] = [
  { id: 'idle', name: '待机', mode: '循环候选' }, { id: 'swim', name: '游动', mode: '循环候选' },
  { id: 'eat', name: '吃饭', mode: '单次动作' }, { id: 'play', name: '玩耍', mode: '单次动作' },
  { id: 'happy', name: '开心', mode: '单次动作' }, { id: 'sleep', name: '睡觉', mode: '循环候选' },
];
const date = (n: number) => new Date(n).toLocaleString('zh-CN', { hour12: false });

export function App() {
  const { pet, loading, saving, error, initialize, createPet, busy, display, animationId, messages, send, complete, sensors, setSensors, tick } = usePetStore();
  const [name, setName] = useState('Amoo');
  const [preview, setPreview] = useState<Behavior | null>(null);
  const [command, setCommand] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [videoError, setVideoError] = useState(false);
  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    if (!pet?.profile.petId) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const schedule = () => {
      clearInterval(timer);
      if (!document.hidden) timer = setInterval(() => { void tick(); }, 60_000);
    };
    schedule(); document.addEventListener('visibilitychange', schedule);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', schedule); };
  }, [pet?.profile.petId, tick]);
  const shown = preview ?? display;
  const active = clips.find(c => c.id === shown)!;
  return <main>
    <header><a className="brand" href="/">amoo<span>●</span></a><span className="version">DESKTOP P0 <i /> 本地原型</span></header>
    <section className="intro"><div><p className="eyebrow">A LITTLE LIFE, A LASTING BOND</p><h1>陪伴，从第一次见面开始。</h1><p className="muted">一个拥有自己身份的小生命，正在这里等你。</p></div><span className="phase">04 / 自主行为与虚拟传感器</span></section>
    {error && <div className="error" role="alert">{error} <button onClick={() => { void initialize(); }}>重试读取</button></div>}
    <div className="layout"><section className="aquarium card">
      <div className="scene-label"><span>AMOO'S LITTLE WORLD</span><span className="pill">{active.name} · {preview ? '素材预览' : '设备模拟'}</span></div>
      <video key={`${shown}-${preview ? 'preview' : animationId}`} src={`/amoo/${shown}.mp4`} autoPlay muted playsInline controls loop={['idle', 'swim', 'sleep'].includes(shown)} onEnded={() => { if (!preview) void complete(display, animationId); }} onError={() => setVideoError(true)} onLoadedMetadata={e => { const v = e.currentTarget; setMetadata(m => ({ ...m, [shown]: `${v.videoWidth} × ${v.videoHeight} · ${v.duration.toFixed(2)} 秒` })); }} />
      {videoError && <p role="alert" className="error">视频无法播放，请尝试其他素材或检查浏览器支持。</p>}
      <div className="scene-footer"><div><h2>{pet?.profile.name ?? '你好，我是 Amoo'}</h2><p>{pet ? '身份已保存在这台浏览器里。下次见面，还是我。' : '先给我一个名字，让我们的故事有一个开始。'}</p></div><span className="live-dot">{pet ? '已保存' : '等待相遇'}</span></div>
    </section>
    <aside className="card identity"><p className="eyebrow">OUR FIRST CHAPTER</p><h2>{pet ? '这是你的 Amoo' : '认识你的新伙伴'}</h2>
      {loading ? <p role="status">正在读取本地档案…</p> : pet ? <><div className="identity-name">{pet.profile.name}<span>唯一身份 · 持续存在</span></div><dl><dt>第一次见面</dt><dd>{date(pet.profile.birthday)}</dd><dt>宠物 ID</dt><dd className="mono">{pet.profile.petId}</dd><dt>状态保存时间</dt><dd>{date(pet.state.updatedAt)}</dd></dl><div className="saved">✓ 身份与状态已写入 IndexedDB</div></> : <form onSubmit={e => { e.preventDefault(); void createPet(name); }}><label htmlFor="pet-name">给它取个名字</label><input id="pet-name" value={name} maxLength={20} onChange={e => setName(e.target.value)} required placeholder="例如：Amoo"/><p className="hint">1–20 个字符，这是它故事的起点。</p><button className="primary" disabled={saving || !name.trim()}>{saving ? '正在保存…' : '与 Amoo 初次见面 →'}</button></form>}
      <div className="note">本阶段离线期间暂停状态变化。请使用同一浏览器与固定地址访问；清除网站数据会删除本地档案。</div>
    </aside></div>
    <section className="card agent"><div className="section-heading"><div><p className="eyebrow">TEXT IN · AMOO RESPONDS</p><h2>文字指令模拟器</h2></div><span className="muted">模拟手机纯文字对话 → 硬件反应</span></div>
      <p className="hint">可输入：喂它、陪它玩、睡觉、醒来、游动、开心、它怎么样、你记得什么。对话仅供调试，不保存聊天记录。</p>
      <div className="conversation" role="log" aria-label="指令与反馈" aria-live="polite">{messages.length ? messages.map((m, i) => <p className={m.role} key={i}><b>{m.role === 'user' ? '你' : 'Amoo'}</b>{m.text}</p>) : <p className="hint">发一句话，看看 Amoo 如何回应。</p>}</div>
      <form className="command-form" onSubmit={e => { e.preventDefault(); if (!pet || busy || loading) return; setPreview(null); setVideoError(false); void send(command); setCommand(''); }}><label className="sr-only" htmlFor="command">给 Amoo 发指令</label><input id="command" value={command} maxLength={200} onChange={e => setCommand(e.target.value)} disabled={!pet || loading || busy} placeholder={pet ? '例如：喂它' : '请先创建 Amoo'}/><button className="primary" disabled={!pet || loading || busy || !command.trim()}>{busy ? '执行中…' : '发送指令'}</button></form>
      {preview && <button className="return-device" onClick={() => { setPreview(null); setVideoError(false); }}>返回设备模拟（{clips.find(c => c.id === display)?.name}）</button>}
    </section>
    <section className="card states"><div className="section-heading"><div><p className="eyebrow">HOW AMOO FEELS</p><h2>它现在的状态</h2></div><span className="muted">{pet ? '在线每分钟更新 · 后台与离线暂停' : '创建后显示初始状态'}</span></div><div className="state-grid">{([{ key: 'satiety', label: '饱腹度', icon: '◔', color: '#e5a46a' }, { key: 'energy', label: '精力', icon: 'ϟ', color: '#a2bf9a' }, { key: 'mood', label: '心情', icon: '☺', color: '#e4be69' }, { key: 'bond', label: '亲密度', icon: '♡', color: '#d598a1' }] as const).map(s => <div className="stat" key={s.key}><div><span>{s.icon} {s.label}</span><strong>{pet ? pet.state[s.key] : '—'}<small> / 100</small></strong></div><div className="track"><div style={{ width: `${pet?.state[s.key] ?? 0}%`, background: s.color }}/></div></div>)}</div></section>
    <section className="card materials"><div className="section-heading"><div><p className="eyebrow">SIX WAYS TO BE AMOO</p><h2>六种模样，同一个 Amoo</h2></div><span className="muted">仅切换素材预览，不修改宠物状态</span></div><div className="clips">{clips.map(c => <button key={c.id} className={preview === c.id ? 'clip selected' : 'clip'} aria-pressed={preview === c.id} onClick={() => { setVideoError(false); setPreview(c.id); }}><span>{c.name}</span><small>{c.id} / {c.mode}</small></button>)}</div><p className="hint">当前预览：{active.name} · {metadata[shown] ?? '正在读取视频信息…'} · 循环衔接待后续调整</p></section>
    <section className="card sensors"><div className="section-heading"><div><p className="eyebrow">AWARE OF YOUR WORLD</p><h2>虚拟环境与自主行为</h2></div><span className="muted">开发模拟 · 尚未连接硬件</span></div>
      <div className="sensor-controls"><label>环境光线<select aria-label="环境光线" disabled={!pet || busy || loading} value={sensors.light} onChange={e => { setPreview(null); void setSensors({ ...sensors, light: e.target.value as typeof sensors.light }); }}><option value="dark">暗</option><option value="normal">正常</option><option value="bright">明亮</option></select></label><label>用户距离<select aria-label="用户距离" disabled={!pet || busy || loading} value={sensors.distance} onChange={e => { setPreview(null); void setSensors({ ...sensors, distance: e.target.value as typeof sensors.distance }); }}><option value="far">远</option><option value="near">近</option></select></label><button className="return-device" disabled={!pet || busy || loading} onClick={() => { setPreview(null); void tick(); }}>模拟经过 1 分钟</button></div>
      <p className="hint">每个可见在线分钟：饱腹度 −1；清醒精力 −1，睡眠精力 +3。精力 ≤15 自动休息；待机与游动每分钟交替。页面隐藏、关闭期间暂停，不追算时间。</p><p className="hint">光线切换为暗 → 入睡；距离从远变近 → 开心回应、亲密度 +1。睡眠时靠近不打扰，恢复亮度不自动唤醒。传感器只在条件变化时触发，刷新后重置为正常 / 远；文字互动仍可明确唤醒。无单独靠近素材，暂用开心表达。</p>
    </section>
    <section className="history-grid">
      <div className="card history"><p className="eyebrow">THINGS I REMEMBER</p><h2>我们的长期记忆</h2><p className="hint">重要经历与规则型偏好，会在下次见面时保留。</p><div aria-label="长期记忆">{pet?.memories.length ? pet.memories.map(m => <article className="memory-item" key={m.id}><span className="memory-kind">{m.type === 'milestone' ? '里程碑' : '陪玩偏好'}</span><p>{m.content}</p><time>{date(m.createdAt)}</time></article>) : <p className="hint">创建 Amoo 后，故事从名字开始。</p>}</div><p className="hint">偏好规则：最近 7 次陪玩中，至少 5 次在同一时段。时区：北京时间。保存观察结果，不代表固定习惯。</p></div>
      <div className="card history"><p className="eyebrow">OUR SHARED TIMELINE</p><h2>最近发生的事</h2><p className="hint">共 {pet?.events.length ?? 0} 条记录，展示最近 30 条。</p><div className="event-list" aria-label="事件记录">{pet?.events.slice(-30).reverse().map(e => <article className="event-item" key={e.id}><span>{eventLabels[e.type] ?? e.type}</span><time>{date(e.timestamp)}</time></article>)}</div></div>
    </section>
    <footer><span>AMOO PET · 每一次见面，都接着上一次。</span><span>下一阶段：完整 P0 验收与动画衔接</span></footer>
  </main>;
}
