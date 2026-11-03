> 本文件为源码提供者的历史 README 快照，保留用于追溯来源。当前仅任务点版请阅读 [用户教程](USER_GUIDE.md)。以下安装链接、版本和功能说明属于上游历史内容。

# 超星学习通自动化脚本（支持接入各种主流AI模型API）

> **目前脚本最新版本为 1.7.7，请已安装脚本的用户尽快更新。** 使用下方安装入口可安装或覆盖更新。

[![版本](https://img.shields.io/badge/版本-1.7.7-1d7b70?style=flat-square)](https://github.com/Flyer2333/xuexitong-ai-assistant/releases)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-油猴脚本-1d7b70?style=flat-square)](https://www.tampermonkey.net/)
[![Stars](https://img.shields.io/github/stars/Flyer2333/xuexitong-ai-assistant?style=flat-square)](https://github.com/Flyer2333/xuexitong-ai-assistant/stargazers)
[![最近提交](https://img.shields.io/github/last-commit/Flyer2333/xuexitong-ai-assistant?style=flat-square)](https://github.com/Flyer2333/xuexitong-ai-assistant/commits/main)

[![一键安装 / 更新脚本](docs/readme/install.svg)](https://raw.githubusercontent.com/Flyer2333/xuexitong-ai-assistant/main/dist/xuexitong-ai-assistant.user.js)

[**三步跑起来 →**](#三步跑起来) · [**能干什么 →**](#能干什么) · [**配置 AI →**](#配置-ai)

<img src="docs/themes/ridge-1.7.4.png" width="300" alt="默认主题“山行”·实际脚本面板" />

---

⭐ **如果这个脚本帮上了忙，欢迎给项目点个 Star，作者才有动力继续维护。**

<a href="https://github.com/Flyer2333/xuexitong-ai-assistant/stargazers"><img src="docs/star-guide.png" width="340" alt="点 Star 的位置：右上角 Star 点亮后显示 Starred" /></a>

[![支持作者](docs/support-badge.svg)](docs/SUPPORT.md)

---

## ✨ 能干什么

**📺 自动学习**

- **视频 / 音频** —— 自动播放、静音、倍速（最高 16×），播完核对平台任务点
- **PDF / Word** —— 打开预览、滚到底、停 30 秒
- **专题阅读** —— 按目录逐项打开，每项读满 90 秒
- **视频中途弹题** —— 自动答掉，再接着播

**✍️ 章节测验和讨论**

- **章节测验** —— 单选、多选、判断、填空、简答
- **先看答案** —— 只预览，不填、不保存、不提交
- **答错自动重做** —— 读平台给的正确答案再改一次，不硬刷同一组错答案
- **章节里的讨论** —— 跟着所在章节一起跑，按老师要求的字数作答，能读原帖里的图片
- **待批阅** —— 老师还没批的题，保留你交过的答案继续往下做

**📄 作业**

- **客观题直接答** —— 主观题里你写好的内容不动
- **让 AI 写主观题** —— 计算、简答、论述，单独开关，暂存还是直接提交你定
- **复查 AI 作答** —— 逐题列差异，不覆盖你原来的填写

**🗂 课程管理**

- **课程队列** —— 个人空间勾几门课，按你排的顺序刷
- **章节搜索** —— 搜章节、筛没刷完的、点原生入口直接跳过去
- **集中补做** —— 之前跳过的，一键回头再试

**🎨 界面和外观**

- **14 套主题** —— 山行、潮汐、奶龙、奶蛙，外加 9 个 AI 角色主题
- **接上模型自动换肤** —— 测通 DeepSeek 就变 DeepSeek 主题
- **动效可关** —— 尊重系统的“减少动态效果”

**🔌 模型接入**

- **10 家服务商** —— DeepSeek、Kimi、智谱、千问、豆包、小米 MiMo、硅基流动、OpenAI、Claude、Gemini
- **文字 / 图片分开配** —— 看图题可以单独指定视觉模型
- **也能连本地 Codex** —— 用电脑上装好的 Codex CLI 答题

---

<a id="三步跑起来"></a>
<a id="安装学习助手"></a>
<a id="第一次使用从哪里打开学习助手"></a>

## 🚀 三步跑起来

### 1️⃣ 装个油猴

浏览器装 [Tampermonkey（油猴）](https://www.tampermonkey.net/)，Chrome、Edge、Firefox 都行。

装好后进扩展详情，把 **允许用户脚本** 打开：

![油猴扩展详情：开启允许用户脚本](docs/getting-started/tampermonkey-permissions.png)

### 2️⃣ 装脚本

点上面的按钮，确认安装就行。

按钮点不开？改用 [ZIP 手动安装](docs/INSTALL.md#安装脚本)：下载 → 解压 → 复制 `dist/xuexitong-ai-assistant.user.js` 的全部内容 → 粘进油猴编辑器 → 保存。

### 3️⃣ 进课程，点开始

1. 打开学习通 → 你的课程 → **章节** → 点开**一条具体小节**（“1.1”那种）
2. 页面右下角出现 **学习助手** 面板 —— 停在课程首页或章节列表是看不到的
3. 选运行模式：
   - **不接入 AI** → 直接点 **开始自动**。播视频、读文档，不用填 Key
   - **接入 AI（自动答题）** → 先配接口、点 **测试 AI**，通过后再开始

| ① 点开具体小节 | ② 右下角就是学习助手 |
| :---: | :---: |
| [![章节目录，点击小节名称](docs/getting-started/chapter-directory-thumb.png)](docs/getting-started/chapter-directory.png) | [![章节学习页，学习助手面板](docs/getting-started/chapter-study-thumb.png)](docs/getting-started/chapter-study.png) |
| 点“1.1”“1.2”这样的小节名，大章旁的箭头只是展开目录 | 正文出现视频、文档或检测后查看面板。装之前就开着的页面，记得刷新 |

---

## 🧩 面板里有什么

![面板整体布局：学习、课程、接口三个工作区，侧栏是五个分区](docs/panel-layout/overview.png)

面板分成五个区，**切换区不会开始学习、也不会提交任何东西**。

| 入口 | 放了什么 | 看一眼 |
| --- | --- | --- |
| **学习** | 倍速、静音、夜间休息、简答题和讨论策略、最下方的“页面与学习设置” | [学习区](docs/panel-layout/desktop-study.png) |
| **课程** | 章节搜索、待处理筛选、原生入口定位、课程队列 | [课程区](docs/panel-layout/desktop-course.png) |
| **接口** | 运行模式、文字 / 图片接口、已保存配置和用途 | [接口区](docs/panel-layout/desktop-ai.png) |
| **记录** | 答案预览、跳过记录、集中补做、暂存测验返回、诊断导出 | [记录区](docs/panel-layout/desktop-records.png) |
| **更多** | 外观主题、版本检查、反馈入口 | — |

[面板布局与全部实际截图 →](docs/PANEL_LAYOUT.md)

---

## 📺 章节和答题

<img src="docs/panel-layout/desktop-study.png" width="460" alt="学习区实际界面：倍速、视频播放至、静音与夜间休息" />

| 课程里遇到的东西 | 脚本怎么处理 |
| --- | --- |
| 一页多个视频 / 音频 | 一个个播，静音和倍速照你设置走，播完核对平台任务点 |
| 视频播到一半弹题 | 自动答掉再继续播；平台允许重交就再试一次 |
| PDF、Word 预览 | 打开、滚到底、停 30 秒，再接本章检测 |
| 专题阅读 | 按目录逐项打开，每项读满 90 秒，结束回到原课程 |
| 一章好几份测验（课前 / 课后） | 各自算各自的，一份做完不算整章完成 |

**倍速** 1× 1.1× 1.2× 1.25× 1.5× 1.75× 2× 4× 8× 16×，选完保存。视频还能选**播到 90% 或 100%**，默认 100% 播到底；选 90% 会留一点余量，并等平台任务点确认。

**播放完成、跳过、平台打勾** —— 这是三件事，脚本不会混为一谈。

### 答题的细节

- **题型** —— 章节检测支持单选、多选、判断、填空、简答。普通文本框和富文本空位分开处理，填完会回读核对
- **预览答案** —— 只显示答案和解析，**不填、不保存、不提交**。想先看再决定就用它
- **整份测验含简答题时**，可以选“直接提交”“暂时保存”“直接跳过”，第一次用默认暂时保存
- **暂存成功的测验**进“暂时保存的测验”列表，之后能回到原章节和具体测验
- **答错了会重做** —— 平台给了正确答案并允许重做时，用能对上题号的答案再改一次；没给就按得分历史复核，**不反复提交同一组错答案**
- **待批阅的题** —— 标着“待批阅”时，脚本保留你交过的答案继续做别的，**不刷新、不改答案、不重交**
- **英文题和翻译题分得清** —— 题目要求什么语言就答什么语言，中文讲解另外给
- **上下文保留** —— 共享文章、多空题、长阅读会带上能认出来的上下文一起发给模型

---

## 💬 章节里的讨论

**讨论是章节任务的一部分，跟着所在章节一起跑，脚本里没有单独的讨论入口。**

- **作答长度三选一** —— 简短、详细、自定义。老师明确要求的字数优先
- **没有明确要求时**，简短 / 详细按题意组织，**不超过 800 字**。自定义支持严格计数或大约范围，改动会留下说明
- **原帖图片按顺序处理** —— 老师正文里的图片发给图片接口，**不拿头像或同学回复当题目材料**
- **人工草稿会保护** —— 已有的草稿或真实附件不会被覆盖
- **发表后要回课程核对** —— 结果不明的记为待复核，**不会反复发同一条**

---

## 📄 作业

<img src="docs/panel-layout/desktop-homework.png" width="460" alt="作业模式实际界面：主观题处理开关与作业结束后的三个选项" />

作业是**独立模式**：手动打开一份作业后，切到“作业”板块。

- **默认只答客观题**，主观题里你写好的内容不动
- **作答完不额外点保存、不额外点提交**
- **想让 AI 写主观题**（计算、简答、论述），单独开开关，并决定暂存还是直接提交
- **复查 AI 作答**会重新要一次答案，逐题跟你现在的填写对比，**只列差异，不覆盖原答**。可以反复查
- **请求期间你手动改了答案**、换了作业、按了停止，**旧结果不会偷偷回填**
- **提交结果不明时留防重记录**，刷新页面不会重复交一遍

[作业用法与适配范围 →](docs/HOMEWORK.md)

---

## 🗂 课程安排

<img src="docs/panel-layout/desktop-course.png" width="460" alt="课程区实际界面：待刷列表与章节目录" />

| 想找回的东西 | 入口在哪 |
| --- | --- |
| 当前和后面的章节 | 课程区搜索、筛未完成或待核对，点原生章节入口定位，可以暂停或主动跳过 |
| 连续刷多门课 | 个人空间勾选课程、调整顺序，再显式开始队列。直接从单门课开始，不会自己扩到别的课 |
| 一时处理不了的 | AI 模式下每章最多先测试并重开一次；还失败就记成待复核，继续做剩下的。不接 AI 时不测接口 |
| 之前跳过的章节 | “集中补做”重新核对目录后再试；账号、课程、目录对不上或提交结果不明时不硬来 |
| 暂存过的测验 | 独立列表，回到原章节和具体测验。不混进普通跳过记录，也不自动续填或提交 |

**队列按当前标签、账号和课程核对上下文。** 进下一门课之前需要有明确的完成标记，未知状态不会被当成完成。分页没加载、页面皮肤陌生、找不到可靠入口时，会交回给你手动接管。

跑完一轮，**记录区**会留下这一轮的结果，方便回头核对：

<img src="docs/panel-layout/desktop-records.png" width="460" alt="记录区实际界面：答案预览、跳过的章节和暂时保存的测验" />

---

<a id="配置-ai"></a>
<a id="模型配置"></a>

## 🔌 配置 AI

<img src="docs/panel-layout/desktop-ai.png" width="460" alt="接口区实际界面：运行模式、文字接口与图片接口分开选" />

### 文字题和图片题，可以各用一套接口

普通文字题走文字接口。真题图、图表、公式、读不出来的特殊字体，才走图片流程。

两边可以分别选服务商、模型和 Key，也可以让同一个接口两边都用。**页面按钮上的小图标不会把文字题变成图片题。**

内置 10 家服务商，也支持自定义 / OpenAI 兼容接口、本地 Codex 和 CodeBuddy / WorkBuddy：

| 服务商 | 协议 | Base URL 示例 | 图片 |
| --- | --- | --- | --- |
| OpenAI | Responses（默认）或 Chat Completions | `https://api.openai.com/v1` | 选视觉模型 |
| Claude | Claude Messages | `https://api.anthropic.com/v1` | 选支持视觉的模型 |
| Gemini | Gemini generateContent | `https://generativelanguage.googleapis.com/v1beta` | 看模型能力 |
| DeepSeek | OpenAI Chat Completions | `https://api.deepseek.com/v1` | 预设关 |
| 小米 MiMo | OpenAI Chat Completions | `https://api.xiaomimimo.com/v1` | 预设关 |
| Kimi / Moonshot | OpenAI Chat Completions | `https://api.moonshot.cn/v1` | 看模型能力 |
| 智谱 GLM | OpenAI Chat Completions | `https://open.bigmodel.cn/api/paas/v4` | 视觉模型才开 |
| 通义千问 / 百炼 | OpenAI Chat Completions | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 视觉模型才开 |
| 豆包 / 火山方舟 | OpenAI Chat Completions | `https://ark.cn-beijing.volces.com/api/v3` | 看模型能力 |
| 硅基流动 | OpenAI Chat Completions | `https://api.siliconflow.cn/v1` | 看托管模型能力 |
| 自定义 / OpenAI 兼容 | 对应协议 | 厂商给的基础地址 | 看模型能力 |

**Base URL 只填到 `/v1` 这一层**，别把 `/chat/completions` 也粘进去。模型下拉框里没有你要的型号，就选“没有我要的模型，手动填写”，照控制台完整 ID 填。

- **最多存 30 组接口** —— 卡片上能看到模型、地址、遮起来的 Key 和最近一次成功调用的时间
- **测试 AI** 发一条短请求验证配置，图片能力另外用随机数字图测。**测试会花钱**，通过也不保证复杂题一定答对
- **单页最多 256 题** —— 一般文字 16 题一批、图片 8 题一批，题目长的会提前拆批。**所有批次都拿到有效结果才动笔填**
- **本地 Codex** —— 电脑装好 Codex CLI 后跑 `npm run start:codex`，菜单里选模型和推理强度就能用。详情见 [安装教程](docs/INSTALL.md#local-codex)
- **WorkBuddy / CodeBuddy** —— 通过官方 CodeBuddy CLI 和同站点、同账号的 WorkBuddy 积分连接，下面有操作步骤

[服务商配置详解 →](docs/PROVIDERS.md) · [模型目录与推理参数 →](docs/MODELS.md) · [自定义接口 / Ollama 等 →](docs/CUSTOM_API.md)

### 用 WorkBuddy 积分连接

1. 安装 Node.js 20.11 或更高版本，下载并解压 [1.7.7 完整源码 ZIP](https://github.com/Flyer2333/xuexitong-ai-assistant/releases/download/v1.7.7/xuexitong-ai-assistant-1.7.7-source.zip)，在解压后的项目文件夹打开 PowerShell。
2. 安装官方 CodeBuddy CLI 并登录：

   ```powershell
   npm install --prefix ./src/local/codebuddy --cache ./src/local/npm-cache --no-audit --no-fund @tencent-ai/codebuddy-code@2.177.1
   npm run login:codebuddy
   ```

   按提示选择与 WorkBuddy **相同站点、相同账号**，在官方页面完成登录。
3. 在同一文件夹运行 `npm run start:codebuddy`，保持服务窗口开启。默认模型由 CLI 选择；如需指定账号可用模型，见 [完整教程](docs/WORKBUDDY.md)。
4. 在脚本面板“接口 → 添加 / 编辑接口”选择“本地 CodeBuddy / WorkBuddy”，地址填 `http://127.0.0.1:18764`，将 `src/local/codebuddy-token.txt` 中的连接码填入面板，保存并点击“测试 AI”。需要图片时，再把图片用途也设好并测试。

测试和答题可能消耗积分；模型和图片能力因账号而异，请以官方用量明细及自己的测试结果为准。连接码和登录文件不要发给别人。

---

## ⚙️ 常用设置速查

| 设置 | 默认 | 说明 |
| --- | --- | --- |
| 音视频倍速 | 1× | 最高 16×，选完保存 |
| 静音播放 | 开 | 会尽量用标签页静音，静音失败再退回播放器静音 |
| 视频播到 | 100% | 可改 90%，会等平台任务点确认 |
| 文档停留 | 30 秒 | 会滚到文档底部 |
| 专题每项 | 90 秒 | 需要标签页在前台有焦点才计时 |
| 夜间休息 | 23:00–07:00 | 北京时间，到点暂停，休息完手动继续 |
| 视频之间等待 | 0 秒 | 可以自己加 |
| 跳过记录 | 最近 20 条 | 当前课程最多存 100 条，只在本机 |
| 已保存接口 | 30 组 | 超出前先删掉不用的 |
| 定时休息 / 夜间 | 关 | 需要时自己开 |

<details>
<summary>🎨 外观与页面显示</summary>

**默认主题「山行」和「潮汐」** —— 两套原创风景，配色覆盖面板、导航、状态和输入框，不接 AI 也能用：

![山行与潮汐两套默认主题](docs/themes/landscape-preview.png)

**AI 角色主题** —— 文字接口测试通过就自动切换成对应模型的样子：

![DeepSeek、GPT、Claude 主题界面](docs/themes/featured.png)

- **14 套主题** —— 山行、潮汐、默认、奶龙、奶蛙，加上 DeepSeek、GPT、Claude、Gemini、GLM、Kimi、千问、豆包、MiMo 九个 AI 角色主题
- **文字接口测试通过就自动切到对应主题**，图片接口不改变主主题。之后可以手动换回来
- **可以按需隐藏** —— 平台 AI 助教、视频浮动水印、明确已结束的课程卡片、个人空间侧栏头像；取消就恢复
- **右上角可以直接检查更新** —— 新版本提醒能关能延后；自动检查只在浏览器明确识别为 WLAN 且你开了选项时才跑
- **可以导出脱敏诊断** —— 脚本不会自动上传题目、截图、课程地址或 Key

[主题图鉴 →](docs/THEMES.md) · [动效说明 →](docs/PANEL_MOTION.md)

</details>

---

<a id="开始前记住这几件事"></a>
<a id="建议将课程页保持在前台"></a>

## ⚠️ 开始前记住这几件事

说在前面，免得你踩坑。

- **课程页必须保持在前台。** 作者反复实测过，切到别的标签页、锁屏、让电脑休眠，浏览器的后台计时器会被掐掉，弹题和“继续学习”就会延迟。作者已经明确说过：**不保证后台能稳定跑**，窗口摆放办法见 [独立窗口摆放说明](docs/WINDOW_LAYOUT.md)。
- **页面和电脑都得开着。** 关掉课程页或让电脑睡了，脚本没法自己回来。
- **考试不自动交卷。** 作图题、连线题、排序题，以及还没适配的页面，都得你自己来。
- **任务点变绿 ≠ 满分。** 章节看平台任务点，成绩看实际得分，两回事。
- **Key 存在油猴存储里，不是加密保险箱。** 别把油猴存储导出给别人。调用时题目会发往你配的那个接口。
- **只启用一份控制同一课程的脚本。** 之前装过 BG、FACE、PREVIEW 这类测试脚本的，先停掉。

[数据与隐私说明 →](docs/SECURITY.md)

<details>
<summary>🪟 参考：把课程页和面板摆在一起</summary>

把课程页单独放一个窗口、面板挪到屏幕空白处，能少切窗口、少误触：

<a href="docs/window-layout/step-1.png"><img src="docs/window-layout/step-1.png" width="520" alt="独立窗口摆放：课程页和助手面板分开放" /></a>

完整四步见 [独立窗口摆放说明](docs/WINDOW_LAYOUT.md)。

</details>

---

## ❓ 常见问题

| 现象 | 怎么办 |
| --- | --- |
| 面板不出现 | 确认进了具体小节、脚本已启用、扩展允许用户脚本、刷新页面。见 [逐步排查](docs/GUIDE.md#第一次使用从哪里打开学习助手) |
| 401 / 403 | 核对 Key、账号模型权限、地区条件 |
| 404 | 核对 Base URL、模型 ID、区域和接入点 |
| 400 | 换成模型支持的协议，关掉 JSON 模式和推理参数 |
| 429 | 余额或限流，等会儿手动重试 |
| 返回的不是 JSON | URL 可能填成了网页，或者模型没按格式输出 |
| 图片题读不出来 | 检查截图预览、视觉模型、图片有没有加载出来 |
| 文档没打勾 | 预览可能跨域，或者阅读器没加载；以平台标记为准 |
| 专题不计时 | 阅读标签要在前台、有焦点，没暂停、没进夜间休息 |
| 视频一直不动 | 看是不是弹题没答、继续按钮没认出来；停用同类脚本后刷新 |
| 提交或重做超时 | 看看是不是出现了新的确认弹窗样式，别反复点 |

更细的排查表见 [安装教程](docs/INSTALL.md#常见问题) 和 [详细使用说明](docs/GUIDE.md)。

---

## 🆕 最近更新

**1.7.7**（2026-10-29）

- 新增 WorkBuddy / CodeBuddy 本地连接，面板提供教程入口

**1.7.6**（2026-10-29）

- 修复部分作业多选题因选项标记不同而提示题型未适配的问题

**1.7.5**（2026-10-28）

- **播放器加载较慢时继续等待**，不提前切到章节测验或下一节
- **切章时清理上一章播放器的旧状态**，避免把新视频误判为已完成
- 保留已完成媒体跳过、平台任务点核对和停止 / 预览保护

**1.7.4**（2026-10-27）

- **文字模型测试通过**，章节页和作业页立刻换成对应的 AI 主题
- **新增**讨论题、简答题和独立作业处理
- **新增**课程队列、章节搜索和分区工作台；课程首页不再出现多余浮窗
- **新增**“山行”“潮汐”两套主题；倍速补上 1.1×、1.2×、4×、8×、16×
- **视频可以选播到** 90% 或 100%，默认 100%

[完整更新记录 →](CHANGELOG.md) · [历史版本表 →](docs/HISTORY.md) · [安装后怎么更新 →](docs/UPDATES.md)

<details>
<summary>🔄 更新脚本的三步</summary>

| ① 点面板里的更新按钮 | ② 保留中转页，等油猴加载 | ③ 油猴确认页点“更新” |
| :---: | :---: | :---: |
| [![点击更新按钮](docs/getting-started/update-step-1.png)](docs/getting-started/update-step-1.png) | [![更新中转页面](docs/getting-started/update-step-2.png)](docs/getting-started/update-step-2.png) | [![油猴更新确认页](docs/getting-started/update-step-3.png)](docs/getting-started/update-step-3.png) |

第 ② 步可能要等一分钟左右才弹出确认窗口，**别急着关页面**。更多情况见 [更新教程](docs/UPDATES.md)。

</details>

---

## 📚 文档

| 文档 | 讲什么 |
| --- | --- |
| [详细使用说明](docs/GUIDE.md) | 面板每一项、首次使用、恢复与跳过 |
| [完整功能说明](docs/FEATURES.md) | 所有功能、题型适配、执行顺序 |
| [安装教程](docs/INSTALL.md) | 安装、更新、连本地 Codex、排错 |
| [WorkBuddy 连接教程](docs/WORKBUDDY.md) | 安装、登录官方 CodeBuddy CLI 和使用积分 |
| [模型配置](docs/PROVIDERS.md) | 10 家服务商的地址、协议、推理参数 |
| [模型目录](docs/MODELS.md) | 已收录的模型 ID 和核查范围 |
| [作业模式](docs/HOMEWORK.md) | 作业的填写、复查、提交边界 |
| [面板布局](docs/PANEL_LAYOUT.md) | 五个工作区和实际截图 |
| [主题图鉴](docs/THEMES.md) | 14 套主题和素材来源 |
| [数据与隐私](docs/SECURITY.md) | 数据流、权限、费用 |
| [验证说明](docs/VALIDATION.md) | 测过什么、没测什么 |

---

## 🤝 参与贡献

想加功能、想适配新题型，都欢迎来聊。

- **报 Bug / 要功能** —— [开 Issue](https://github.com/Flyer2333/xuexitong-ai-assistant/issues/new/choose)。写清楚脚本版本、预期行为、实际现象，以及卡在播放、读题、填写、保存、提交还是等结果哪一步。截图先遮掉账号、课程地址、Key 和会话信息
- **提 PR** —— [Pull Request](https://github.com/Flyer2333/xuexitong-ai-assistant/pulls)。说明使用场景和改动内容，模拟回归、真实页面操作、实际结果分开列。[贡献说明 →](CONTRIBUTING.md)
- **补文档** —— 文档写错了、链接挂了，都欢迎直接改

---

## 📜 来源与许可

- **字体解析依赖、jQuery、html2canvas** 均为 MIT，许可证随仓库附带
- **角色素材**原设计作者是 B 站 UP 主 [ZipZipPipe](https://space.bilibili.com/4168597)

完整的来源、第三方许可和未确认范围见 [NOTICE.md](NOTICE.md)。脚本免费提供，**API Key 和调用费用需要你自己准备**。
