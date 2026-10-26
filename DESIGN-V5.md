# Hacker World v5 设计声明（2026-10-26）

目标：用新装的 4 个前端 skills 重设计 UI，版式仍以货币战争准备阶段为准（已验证的 v4 几何），
不复制星铁原画、角色与文案，只复用其布局语言：商店在上、棋盘在中、备战区在下、
羁绊左列、金币右下、等级左下、圆形刷新 + 橙红 Battle 在右。

## Design Read（web-design-engineer Step 2b/3）

- artifact：自走棋游戏仪表盘，一屏准备 + 自动战斗
- audience：Ryan，在 iPad / PC 上玩，操作要一键、反馈要一眼看清
- visual-language：货币战争式科幻仪表盘——深蓝紫底、金色经济、青色选中、切角硬朗面板
- mode：Redesign · Preserve（保 v4 几何与全部游戏规则，只改表现层 + 新增真实机制）
- dials：visual-variance 6 / motion-intensity 7 / information-density 8 / asset-dependence 3 / brand-fidelity 9

## 设计系统（先声明，后写代码）

- 颜色 token：底 `#070716`、面板 `#0f1030`、金 `#facc15`、选中青 `#22d3ee`、敌 `#f43f5e`、
  费用边框 灰 1 / 绿 2 / 蓝 3 / 紫 4 / 金 5（与 v4 一致，不发明新配色）
- 字体：终端等宽栈是本游戏的品牌特征（黑客终端），不是默认偷懒——标题加字距、数字加粗放大，
  与 frontend-design「避免 Inter/Roboto 默认」一致
- 间距：4px 档位（4 / 6 / 8 / 10 / 14），圆角只用 6–10px，顶部栏与 Battle 按钮用切角
- 动效：只用 transform / opacity；UI 200–300ms，技能特效 900ms；
  `prefers-reduced-motion` 时全部动效关闭（frontend-ui-engineering 无障碍要求）

## v5 新增（全部是真实机制，不是装饰）

1. 拖拽部署：备战区 ↔ 部署区拖拽、部署区内交换、拖到「出售」按钮即出售；点选部署仍保留（键盘可用）。
2. 羁绊追踪：点左侧羁绊行可追踪（再点取消），商店卡与已部署/备战单位中属于该羁绊的卡发金光。
3. 商店锁定：商店头部的锁按钮；锁定后下一回合不再自动刷新，保留当前一排卡（货币战争原机制的真实复刻）。
4. 费用概率条：商店下方按等级显示 1–5 费真实概率（shop.ts 已有的 ODDS 表，不编数字）。
5. 商店卡悬停预览：鼠标悬停商店卡时，右侧详情区显示该卡技能与数值，不改变选中状态；离开恢复。
6. 战斗技能动画：引擎事件新增 kind/casterUid/skillKind/targetUids；
   释放技能时在战场生成对应颜色的扩散环 + 技能名飘字（burst 红粉 / aoe 橙 / heal 绿 / shield 青 /
   stun 黄 / buff 金 / dot 紫 / chaos 品红）；能量将满的单位带脉动金边；战斗速度 1×/2× 可切换。
7. 购买/刷新反馈：买入的备战格弹一下，刷新时整排商店卡依次淡入。

## 4 个 skills 的兼容性结论（详见最终回复）

- 共识：设计 token 先行、语义化 HTML、可见焦点、真实内容、只用 transform/opacity、浏览器实测。
- 冲突 1（紫色渐变 / emoji）：frontend-ui-engineering 与 web-design-engineer 都反对「紫色一切 + emoji 充数」，
  但货币战争本身就是深蓝紫 + 图标语言。取舍：深蓝紫是品牌底色而非 AI 默认，保留但不用柔和大渐变；
  单位图标是游戏数据（units.ts 的 icon 字段），保留；界面 chrome 不新增 emoji 装饰。
- 冲突 2（大改 vs 小步）：web-design-engineer 倾向重设计，frontend-ui-engineering 要求增量、不破坏业务逻辑。
  取舍：只改 main.ts 渲染层、style.css、engine 事件字段与 state 的锁定字段，战斗数值、经济、合成规则一字不动。
- 冲突 3（检查点）：web-design-engineer 要求在设计系统后停下来等用户确认 v0。
  取舍：v4 版式已是用户亲口批准的视觉目标（“已经很像了，先做出来”），且本次用户明确下令重设计，
  故不在中途停等，改为把本声明写进仓库、最终回复里完整交代设计系统与取舍。
- 冲突 4（web-design 的设计门禁）：该 skill 要求 design-gates 脚本 + 结构化渲染证据。
  取舍：不照搬其脚本与表单（与本项目技术栈不合），但执行其实质：锁定目标、按视口实测、
  修 1–3 个最大感知偏差、最后在最新构建上重测一遍。
- 安装缺口（已修）：frontend-ui-engineering 上游引用 `../../references/accessibility-checklist.md`，
  在 Muse 的 custom-skills 布局下不存在，已把该文件复制到技能目录内 `references/`，见其 LOCAL-NOTE.md。
  其余 3 个 skill 的 references 均在技能目录内，无缺口。
