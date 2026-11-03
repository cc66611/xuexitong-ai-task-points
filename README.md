# 学习通 · 多 AI 仅任务点版

当前脚本版本：**1.7.7.8**。只处理平台标记的未完成任务点，已完成和无任务点内容跳过。

## 选一个版本安装

- **[多 AI 通用版](dist/xuexitong-task-points-only.user.js)**：全部接入方式都可选。
- **[Codex 账号版](dist/xuexitong-codex.user.js)**：[Codex 教程](docs/CODEX.md)，使用本地 Codex CLI 登录。
- **[WorkBuddy / CodeBuddy 账号版](dist/xuexitong-workbuddy.user.js)**：[WorkBuddy 教程](docs/WORKBUDDY.md)，通过官方 CLI 连接。
- **[多服务商 API 版](dist/xuexitong-api.user.js)**：[API 教程](docs/API.md)，支持 OpenAI、Claude、Gemini、DeepSeek、Kimi、智谱、千问、豆包、MiMo、硅基流动及兼容接口。

四个版本共用同一核心，功能相同，只改变首次配置预设；可以混用不同文字和图片接口。**只安装一份**，切换版本覆盖原脚本即可，已保存的接口不会被预设覆盖。

## 教程与源码

- 人看：**[用户教程](docs/USER_GUIDE.md)**，按自己的 AI 接入方式操作。
- Agent 看：**[Agent 教程](docs/AGENT_GUIDE.md)**、[AGENTS.md](AGENTS.md)。
- `src/` 完整源码；`dist/` 安装文件；`assets/`、`vendor/` 资源及许可；`tests/`、`scripts/` 测试与构建。

```bash
npm ci --ignore-scripts
npm run build
npm test
npm run package
```

支持已适配的选择、填空、简答、排序、连线、组合子题及图片公式；先测试 AI、预览答案，再开始任务。源码包附逐文件清单和 SHA-256，已排除连接码、登录缓存、真实作业与日志。原作者教程保留供参考，与本版不一致时以新教程为准。来源与许可范围见 [NOTICE.md](NOTICE.md)。
