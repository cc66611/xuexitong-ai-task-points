# 学习通 · Codex 仅任务点版

当前脚本版本：**1.7.7.7**，基于上游 1.7.7 整理。

只处理平台标记的未完成任务点；已完成和无任务点内容直接跳过。支持视频、资料、章节题和手动打开的作业，以及已适配的排序、连线、组合子题、图片与公式题。可通过本地 Codex CLI 使用已登录账号，不需要在脚本中填写 OpenAI API Key。

## 使用

1. 下载并解压本仓库，阅读 **[用户教程](docs/USER_GUIDE.md)**。
2. 油猴导入 [`dist/xuexitong-task-points-only.user.js`](dist/xuexitong-task-points-only.user.js)。
3. 启动本地服务，配置连接码；先测试 AI 和预览答案，再开始任务。

给 Agent 配置、维护或排错，请读 **[Agent 教程](docs/AGENT_GUIDE.md)** 和 [AGENTS.md](AGENTS.md)。

## 文件

- `src/`：完整源码，包括本地 Codex 服务。
- `dist/`：可直接安装的脚本；两个兼容文件均固定为仅任务点模式。
- `assets/`、`vendor/`：界面素材、依赖及其许可。
- `tests/`、`scripts/`：测试、构建和完整源码打包工具。
- `docs/`：两份新教程，以及保留的上游教程与历史说明。

```bash
npm ci --ignore-scripts
npm run build
npm test
npm run package
```

上游教程保留在 [原 README](docs/UPSTREAM_README.md) 和 [安装说明](docs/INSTALL.md)，与本版不一致时以用户教程为准。已排除本地连接码、账号登录文件、真实作业数据和运行日志。来源与尚待确认的许可范围见 [NOTICE.md](NOTICE.md)，不对整个项目重新授予 MIT 等许可。
