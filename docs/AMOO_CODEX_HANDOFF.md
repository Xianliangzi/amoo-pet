# AMOO PET — CODEX HANDOFF

## 0. 使用方式
请先完整阅读本文档，不要立即写代码。
第一步只需要总结：
1. 你理解的产品是什么；
2. P0 要验证什么；
3. 当前技术架构；
4. 当前明确不做什么；
5. 第一轮开发计划。
确认理解一致后再开始编码。

---

## 1. 项目定义

Amoo Pet 是一个由 AI Agent 驱动、拥有持续状态与长期关系记忆的电子宠物项目。

Amoo 不是被手机遥控的一块屏幕，而是一个持续存在的电子生命，拥有：
- 身份 Profile
- 当前状态 State
- 事件历史 Event
- 长期记忆 Memory
- 自主行为
- 环境反馈

核心链路：

User
→ Agent
→ Pet Context
→ Pet Engine
→ Device Adapter
→ Virtual Device / Future ESP32 Device

核心原则：
- Agent 可以刷新，但 Amoo 不能刷新。
- Amoo 的身份、状态与记忆独立于具体 Agent Session。
- Pet Engine 不直接依赖具体硬件或 UI。
- 硬件、传感器统一通过 Adapter 接入。
- 当前先完成电脑端 P0，再接真实硬件。

---

## 2. 当前阶段：P0 Desktop Prototype

先在电脑浏览器中跑通完整产品闭环，不接真实硬件。

当前只验证：
1. Amoo 可以被创建；
2. Amoo 有持续状态；
3. 用户可通过 Agent Simulator 控制 Amoo；
4. State / Event / Memory 可以本地持久化；
5. 页面刷新或重新打开后 Amoo 不会重置；
6. 虚拟传感器可以触发主动行为。

当前暂不做：
- 真实手机 Agent
- ESP32 接入
- BLE / 真实 Wi-Fi 设备控制
- 云端数据库
- 账户体系
- 多宠物 / 多用户
- 社区 / 商城
- 摄像头 / 麦克风
- 本地大模型
- AR / NFT
- 复杂成长系统

---

## 3. P0 核心假设

### H1 — Agent Control
用户输入指令后，系统能读取 Amoo 当前 Context，并触发对应行为。

### H2 — Continuity
关闭页面、刷新页面、重新启动后，Amoo 仍然是同一个 Amoo。

### H3 — Memory
Amoo 可以保留重要历史，并让用户感知到：
“它记得之前发生过什么。”

---

## 4. 推荐技术栈

- Vite
- React
- TypeScript
- Zustand
- IndexedDB
- Dexie.js
- Framer Motion 或 CSS Animation

第一版不接后端，全部数据先保存在浏览器本地 IndexedDB。

---

## 5. 推荐目录结构

```text
src/
├─ components/
│  ├─ PetView.tsx
│  ├─ AgentPanel.tsx
│  ├─ StatePanel.tsx
│  ├─ MemoryPanel.tsx
│  └─ SensorPanel.tsx
├─ core/
│  ├─ petEngine.ts
│  ├─ stateMachine.ts
│  ├─ intentParser.ts
│  └─ memoryEngine.ts
├─ adapters/
│  ├─ deviceAdapter.ts
│  ├─ virtualDeviceAdapter.ts
│  ├─ sensorAdapter.ts
│  └─ virtualSensorAdapter.ts
├─ storage/
│  ├─ db.ts
│  └─ repositories.ts
├─ stores/
│  └─ petStore.ts
├─ types/
│  └─ pet.ts
├─ assets/
│  └─ amoo/
└─ App.tsx
```

---

## 6. 数据结构

### PetProfile
```ts
type PetProfile = {
  petId: string
  name: string
  birthday: number
}
```

### PetBehavior
```ts
type PetBehavior =
  | "idle"
  | "swim"
  | "blink"
  | "eat"
  | "play"
  | "sleep"
  | "approach"
  | "happy"
```

### PetState
```ts
type PetState = {
  hunger: number
  energy: number
  mood: number
  bond: number
  currentBehavior: PetBehavior
  updatedAt: number
}
```

状态数值统一为 0–100。

### PetEvent
```ts
type PetEvent = {
  id: string
  type: string
  timestamp: number
  payload?: Record<string, unknown>
}
```

### PetMemory
```ts
type PetMemory = {
  id: string
  type: "milestone" | "preference"
  content: string
  importance: number
  createdAt: number
}
```

---

## 7. State / Event / Memory

### State
Amoo 现在怎么样。
例如：
- hunger = 40
- energy = 70
- mood = 80
- behavior = idle

### Event
发生过什么。
例如：
- 14:20 喂食
- 18:30 玩耍
- 23:10 睡觉

### Memory
哪些历史值得长期保留。
例如：
- “主人第一次给我取名叫 Amoo。”
- “主人通常晚上陪我玩。”

P0 不保存完整聊天记录，也不做 LLM 自动总结。

---

## 8. Pet Engine

UI 不允许直接修改 PetState。

所有行为必须经过 PetEngine：

```ts
feed()
play()
sleep()
wake()
approach()
happy()
tick()
```

建议基础规则：

### feed
- hunger +30
- mood +5
- bond +2
- behavior = eat
- 动作结束后回 idle

### play
- energy -15
- mood +15
- bond +5
- behavior = play
- 动作结束后回 idle

### sleep
- behavior = sleep
- 睡眠期间 energy 缓慢恢复

### approach
- behavior = approach
- bond +1

### tick
定时执行：
- hunger 缓慢下降
- energy 缓慢下降
- energy 低于阈值时允许自动 sleep

---

## 9. Agent Simulator

P0 暂时不接真实 LLM。

先做一个输入框，用规则 Intent Parser：

```text
喂 / 吃 → feed
玩 / 陪它 → play
睡 → sleep
醒 → wake
过来 / 看我 → approach
怎么样 / 状态 → status
```

任何宠物相关操作前统一读取：

```ts
getPetContext()
```

返回：

```json
{
  "profile": {},
  "state": {},
  "recentEvents": [],
  "relevantMemories": []
}
```

未来真实手机 Agent 也沿用这一逻辑。

---

## 10. Memory P0

P0 使用规则型 Memory。

### Milestone
首次发生以下事件时写入：
- created
- named
- first_feed
- first_play

### Preference
基于重复行为生成。

示例：
过去 7 次 play 中有 5 次发生于 20:00–24:00：

生成：
“主人通常晚上陪我玩。”

---

## 11. Adapter 设计

### Device Adapter
```ts
interface DeviceAdapter {
  playAnimation(name: string): Promise<void>
  playSound(name: string): Promise<void>
  setBrightness(value: number): Promise<void>
}
```

当前：
- VirtualDeviceAdapter

未来：
- ESP32DeviceAdapter

PetEngine 不允许直接依赖 ESP32 或具体 DOM 动画实现。

### Virtual Sensor

P0 页面提供调试控制：

Environment Light:
- Dark
- Normal
- Bright

User Distance:
- Far
- Near

规则：
- Near → approach
- Dark → sleep

未来分别映射：
- VL53L0X
- GY-302 / BH1750

---

## 12. Amoo 视觉定义

固定特征：
- 胖而短的鱼形轮廓
- 大尾巴
- 小鳍
- 两个简单白色椭圆眼睛
- 无复杂五官
- 半透明果冻材质
- 橙黄色主体
- 粉橘渐变
- 橙红尾部
- 柔和内发光
- 极简
- 可爱但不低幼
- 不写实
- 不使用真实鱼鳞

所有未来素材必须以已经确认的 Amoo 主参考图为基础。

---

## 13. P0 动作

共 8 个动作：

```text
idle
swim
blink
eat
play
sleep
approach
happy
```

Loop：
- idle
- swim
- sleep

One-shot：
- blink
- eat
- play
- approach
- happy

### 动画素材工作流

```text
Amoo Reference Image
→ AI Video Generation
→ 每个动作生成独立短视频
→ 抽帧
→ 筛选 / 裁切 / 统一尺寸
→ Animation Frame Assets
```

动作规范：
- idle：3–4s，轻微漂浮、摆尾、呼吸，可循环
- swim：2–3s，平稳游动、摆尾，可循环
- blink：0.5–1s，单次眨眼
- eat：2–3s，前探、进食、回 idle
- play：2–3s，更活泼、围绕气泡活动
- sleep：3–4s，闭眼、慢漂浮、缓慢呼吸，可循环
- approach：1.5–2s，从稍远位置靠近并停住
- happy：1–2s，笑眼、轻微弹动

电脑端在真实素材完成前可以先使用静态图、GIF 或占位动画。

---

## 14. Desktop P0 页面

第一版只需要一个页面：

```text
┌──────────────────────────────┐
│          Amoo View           │
├───────────────┬──────────────┤
│ State Debug   │ Agent Panel  │
│ Hunger        │ 输入指令      │
│ Energy        │ [Send]       │
│ Mood          │              │
│ Bond          │              │
├───────────────┴──────────────┤
│ Memory / Event Debug         │
├──────────────────────────────┤
│ Virtual Sensor Debug         │
└──────────────────────────────┘
```

正式产品中 Debug UI 可以隐藏。

---

## 15. Persistence

使用 IndexedDB，推荐 Dexie.js。

必须持久化：
- PetProfile
- PetState
- PetEvent
- PetMemory

刷新浏览器后：
- Amoo identity unchanged
- Amoo state retained
- Memory retained

---

## 16. 开发顺序

### Phase 1
- 初始化 Vite + React + TypeScript
- PetProfile
- PetState
- IndexedDB
- Basic Debug UI

### Phase 2
- PetEngine
- State Machine
- PetView
- Idle placeholder

### Phase 3
- Agent Simulator
- Intent Parser
- feed / play / sleep / approach

### Phase 4
- Event
- Memory
- Persistence

### Phase 5
- Virtual Sensor
- Near
- Dark

### Phase 6
- 接入真实 Amoo 动画素材

### Phase 7
- Desktop P0 稳定后再接真实 ESP32

---

## 17. P0 验收标准

必须满足：

### Creation
第一次运行可以创建 Amoo。

### Persistence
刷新页面后 Amoo 不消失。

### Feed
输入“喂它”：
- Amoo 进入 eat
- 状态正确变化

### Play
输入“陪它玩”：
- Amoo 进入 play

### Sleep
输入“睡觉”：
- Amoo 进入 sleep

### Event
每个动作产生 Event。

### Memory
至少产生：
- 命名 Memory
- 第一次喂食 Memory
- 一个 Preference Memory

### Sensor
- Near → approach
- Dark → sleep

---

## 18. 已购买硬件

当前硬件已经购买，但 P0 暂不接入。

### Controller
ESP32-S3 DevKitC-1 N16R8
- 16MB Flash
- 8MB PSRAM
- Wi-Fi
- BLE
- Type-C

### Display
2.8 inch IPS TFT
- ILI9341
- SPI
- 240×320
- Touch

### Audio
- MAX98357 I2S Amplifier
- 8Ω 3W Speaker

### Sensors
- GY-302 / BH1750
- VL53L0X

### Prototype Tools
- 830-hole breadboard
- jumper wires
- MB-102 5V / 3.3V
- USB-A → Type-C data cable

---

## 19. 未来硬件运行逻辑

最终设备不需要一直连接电脑。

电脑只负责开发和烧录。

```text
Phone Agent
→ Wi-Fi
→ ESP32-S3
→ Local State + Local Animation
→ Screen / Speaker / Sensor
```

Amoo 动画未来保存在设备本地。

手机不会不断传视频，只发送动作指令，例如：

```text
ACTION = FEED
```

设备收到后播放本地 eat 动画。

---

## 20. 当前明确不要做

第一轮开发严格不要实现：

- LLM
- OpenAI API
- ESP32
- BLE
- 真实 Wi-Fi device control
- Cloud DB
- Login / Account
- Multi-pet
- Social
- Store
- Voice
- Camera
- Complex AI Memory
- Complex Growth
- Real-time 3D

不要为了“完整”自行增加功能。

---

## 21. 第一轮 Codex 任务

请先：
1. 阅读完整项目说明；
2. 不修改代码；
3. 总结你理解的：
   - 产品定义
   - P0 验证目标
   - 架构
   - 当前不做内容
   - 第一轮开发范围
4. 给出 Phase 1 初始化方案。

确认理解一致后，第一轮只实现：

```text
Vite + React + TypeScript
PetProfile
PetState
IndexedDB / Dexie
Basic Debug UI
```

暂不实现：

```text
LLM
Memory inference
ESP32
real sensors
real animation
```

目标：先完成稳定的数据骨架与持久化基础。
