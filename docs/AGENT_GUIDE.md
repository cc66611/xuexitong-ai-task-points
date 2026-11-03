# Agent 配置与维护教程

本指南面向帮用户安装、排错或继续开发的 Agent。先阅读根目录 [AGENTS.md](../AGENTS.md)、[用户教程](USER_GUIDE.md) 和 [NOTICE](../NOTICE.md)。保留的原作者教程可以作为参考，但本版必须始终保持仅任务点规则。

## 接手后的第一轮检查

1. 在根目录确认 `package.json`、`src/`、`vendor/`、`assets/` 和 `dist/` 都在。用 `git status --short` 识别已有修改，不覆盖用户工作。
2. 先确认用户选择的接入方式。Codex 检查 `codex --version`、`codex login status`；WorkBuddy 检查官方 CodeBuddy CLI 与同站点账号；API 检查实际协议、地址、模型和用途。共同检查 `node --version`、`npm --version`。登录由用户在官方流程中完成，不收集账号密码或复制登录缓存。
3. 读取 `package.json` 中的 `taskPointsVersion`。基础包版本与上游模型目录版本仍是 1.7.7，安装脚本与面板版本是 1.7.7.8，不要把它们混为一谈。
4. 安装开发依赖并构建，完成检查后再让用户安装。服务运行不依赖 Playwright；Playwright 只用于开发验证。

```bash
npm ci --ignore-scripts
npm run build
npm test
```

## 帮用户配置

按照 [用户教程](USER_GUIDE.md) 安装脚本、启动服务。Windows 按所选账号调用 `start-codex.cmd` 或 `start-workbuddy.cmd`。Codex 启动器查找原生程序，自定义位置使用 `XXT_CODEX_BIN`；WorkBuddy 启动器通过官方 CodeBuddy CLI 启动，自定义位置使用 `XXT_CODEBUDDY_BIN`。不要将题目拼接为 shell 命令。

必须从项目根目录启动。Codex 服务默认监听 `127.0.0.1:18763`，连接码为 `src/local/bridge-token.txt`；WorkBuddy/CodeBuddy 默认 `127.0.0.1:18764`，连接码为 `src/local/codebuddy-token.txt`。API 版无需本项目服务，Key 由用户在油猴中本地填写，不索取到聊天或写入文件。使用时可在本地请求头携带连接码，不输出到日志、PR、Issue、教程、截图或聊天。不要改成公网监听，也不要自动更换用户已有连接码。

模型和思考强度在 `npm run start:codex` 菜单选择，偏好保存在 `src/local/codex-launcher.json`。如需非交互方式，设置所选账号实际支持的 `XXT_CODEX_MODEL`、`XXT_CODEX_REASONING`、`XXT_CODEX_BIN`，再运行 `npm run start:codex:direct`。不要为了排错随意切换用户模型或认证方式。

油猴中配置本地 Codex、Base URL 和连接码，明确分配文字和图片两种用途。浏览器工具不能操作扩展内部确认页时，只把最后安装/更新按钮交给用户；不要绕过扩展页面限制。

## 如何证明配置成功

依次区分这些证据，不要把前一步说成后一步已经成功：

1. **健康检查：** `GET /health` 返回成功，仅证明服务可达与认证有效。
2. **真实模型探针：** 面板“测试 AI”实际测试文字和图片，会使用账号用量；先确认用户授权，再运行。
3. **构建验证：** 单元与模拟浏览器测试通过，覆盖代码行为，不代表用户原页面可用。
4. **用户原页面：** 安装后刷新，读取面板实际版本、文字/图片用途和模式，再执行只读答案预览。确认题图确实发送、每道子题都有对应返回，预览没有改变现有输入。不要为了测试而填入、保存、提交作业，或启动整门课程自动流程。
5. **平台反馈：** 仅在用户明确授权实际操作且已观察到平台反馈时，报告相应保存、提交或成绩状态；不能由预览推断判分。

## 关键文件

- `src/page-tasks.js`：任务点归属、完成状态、待处理资源过滤。
- `src/workflow.js`、`src/course-hub.js`：章节调度、课程队列、仅任务点规则。
- `src/dom.js`、`src/capture.js`：可见题图、选项提取、真实截图。
- `src/composite-questions.js`、`src/structured-questions.js`：组合、阅读/完形、排序、连线控件映射。
- `src/homework-dom.js`、`src/homework-runtime.js`、`src/homework.cjs`：独立作业、编辑器、预览与提交策略。
- `src/bridge.mjs`、`src/core.cjs`、`src/ai.js`：本地 CLI、共享校验、接口路由。
- `scripts/build-editions.mjs`、`scripts/build.mjs`、`scripts/build-task-only.mjs`：四个入口的可复现构建。所有产物必须是仅任务点版。
- `scripts/check-public.mjs`、`scripts/package.mjs`：源码同步、隐私检查、源码 ZIP 与校验值。

## 不得破坏的行为

- 已完成任务点的检测优先于播放器加载、播放进度、测验等待；已完成即跳过，不为满分重做。
- 无任务点仅在加载稳定后确认；目录明确待完成但任务无法识别时暂停，不能假报全部完成。
- 标题 `*` 不替代实际任务点标记；同页混合归属和兄弟资源不能互相借用标记。
- 保护人工答案、请求期间的修改和平台已完成状态。停止、切页、身份变化、人工验证后不能由旧请求继续写入。
- 排序保留顺序，连线保持左右映射；不随机猜测结构题或文本题，不删除选项/文本数量校验来“消除报错”。
- 可见的题干 `h3.mark_name[aria-hidden=true]` 和外层选项 UL 的无障碍标记不能导致漏图；真实隐藏内容、装饰控件仍要过滤。
- 组合题每个子题保留公共材料，截图副本去除旧答案与选中标记。缺图须明确失败，不能悄悄走纯文字并声称成功。
- 当前面板显示的作业设置必须与运行使用的设置一致，不能被其他课程标签更新的偏好悄悄替换。
- 文本格式错误最多只修正错误子题一次，保留有效答案；无法回答时不制造空白或随机文本。

## 与改动相关的验证

先运行 `npm test`。需要浏览器时安装独立无头 Chromium：

```bash
npx playwright install chromium
npm run test:task-points
npm run test:homework-combinations
npm run test:formula-options
npm run test:completion-priority
```

Linux CI 如缺系统依赖，使用 `npx playwright install --with-deps chromium`。`XXT_BROWSER_CHANNEL=chromium` 会让旧浏览器用例使用该 Chromium；可通过 `PLAYWRIGHT_BROWSERS_PATH` 指向已存在的缓存，不依赖某台机器的绝对路径。

模板回归应包含真实失败的结构属性：本次修复的关键是题干 H3 上的 `aria-hidden=true`，不是只造一个普通题干。修改前确认用例能复现，修改后确认走图片路由、A～E/子题映射和截图范围正确。

保持默认 Node 测试文件隔离；不要用 `--test-isolation=none` 把所有文件合并运行，测试中的全局对象会互相污染。只运行有意义的相关检查，失败后定位原因，不用反复跑无关测试代替原页面验证。

## 打包和上传

```bash
npm run build
npm test
npm run package
git status --short
```

打包器输出 `artifacts/xuexitong-ai-task-points-1.7.7.8-source.zip`、SHA-256 和文件清单，逐文件核验 ZIP 内容。`src/local/`、`local/`、`output/`、`artifacts/`、`node_modules/`、`.git/`、环境文件、连接码及日志不可进入源码包或提交。

更新安装版本时同步 `package.json.taskPointsVersion` 和 `src/release.json.localVersion`，重新构建两个兼容脚本及元数据；基础包/模型目录版本若没有变化则保留。默认关闭上游自动更新，不能把用户导回原版整章模式。

保留第三方完整许可证和来源注释。整体许可状态见 NOTICE，未确认前不要为整个衍生项目另加 MIT/Apache 声明或改变仓库可见性。检查提交内容后按用户指定仓库上传，报告真实验证范围和仓库链接。

## 可选 GitHub Actions

完整工作流模板保留在 [docs/ci/check.yml](ci/check.yml)。当前上传使用的 Git 凭据没有 `workflow` 权限，因此不在本仓库启用自动工作流，也不扩大用户账号权限。需要启用时，由有相应权限的维护者把该文件复制到 `.github/workflows/check.yml` 并正常提交。模板使用 Node.js 22、锁文件、仅任务点构建与模拟浏览器回归，不需要账号密钥。

## 多 AI 版本与验收

`npm run build` 统一生成 `dist/editions.json` 中列出的通用、Codex、WorkBuddy、API 四个完整入口。只在 `src/release.json` / 构建元数据中指定首次预设，不复制业务代码分叉；所有适配器都保留，已有接口设置优先于新预设。两个本地 CLI 后端共用答案校验和有界格式修正；API 的协议解析按原适配保持。

逐个运行 `npm run test:editions`、`npm run test:editions:browser`，核对首次服务商、13 个现有适配器、凭据空白、无意外模型请求以及已有配置不被覆盖。Codex 操作见 [CODEX.md](CODEX.md)，WorkBuddy 安装/登录与账号同站点要求见 [WORKBUDDY.md](WORKBUDDY.md)，各服务商见 [API.md](API.md)。不要把 HTTP 健康成功、模拟协议测试或一个账号的用量验证说成所有账号都完成真实推理验收。
