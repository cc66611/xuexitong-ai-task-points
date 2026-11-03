# WorkBuddy / CodeBuddy 账号版教程

本版本通过“学习通脚本 → 本机服务 → 官方 CodeBuddy CLI”接入，不读取 WorkBuddy 桌面软件的登录数据库，也不需要填写第三方 API Key。官方说明同一账号的 CodeBuddy 和 WorkBuddy 积分共享；站点、账号、企业权限及具体扣减类型仍需按本人用量记录核对。[官方积分说明](https://www.codebuddy.cn/docs/ide/Account/pricing)

本教程参考保留的 [源码提供者教程](UPSTREAM_WORKBUDDY.md) 和 [官方 CLI 快速开始](https://www.codebuddy.cn/docs/cli/quickstart)。

## 1. 安装脚本与 CLI

按 [用户教程](USER_GUIDE.md) 下载完整项目，油猴导入 `dist/xuexitong-workbuddy.user.js`，刷新课程页并核对版本 **1.7.7.8**。

Node.js 22 或更高版本。在项目根目录安装本项目已适配基线版本的官方 CLI：

```powershell
npm.cmd install --prefix ./src/local/codebuddy --cache ./src/local/npm-cache --no-audit --no-fund @tencent-ai/codebuddy-code@2.177.1
npm.cmd run login:codebuddy
```

已有兼容 CLI 可继续使用，不必为下载本项目重复升级。找不到程序时设置 `XXT_CODEBUDDY_BIN` 为官方 CLI 实际入口路径。安装内容、配置和账号缓存仅存本机，不进入上传包。

## 2. 本人登录和启动

在官方菜单中选与 WorkBuddy 相同站点、同一账号，由本人完成登录。国内站、国际站与企业账号不要混用。首次 CLI 登录默认独立保存在 `src/local/codebuddy-config`。

双击 `启动WorkBuddy助手.cmd`，或运行：

```powershell
npm.cmd run start:codebuddy
```

保持服务窗口打开。默认模型交给 CLI 选择；需要指定时，在启动前设置 `XXT_CODEBUDDY_MODEL` 为该账号真实可用的完整 ID。没有确认模型 ID 时不要照搬其他账号的型号。登录和启动必须使用同一个 `CODEBUDDY_CONFIG_DIR`。

## 3. 面板配置与测试

- 服务商和协议：本地 CodeBuddy / WorkBuddy。
- Base URL：`http://127.0.0.1:18764`。
- API Key / 本地连接码：`src/local/codebuddy-token.txt` 的完整一行。
- 用途先选文字题，保存后“测试 AI”；需要图片再选择图片用途并单独确认测试通过。

不要填写 WorkBuddy 密码、Cookie，也不要填 Codex 的连接码。可以使用 WorkBuddy 文字接口，配另一家已验证的图片接口。只安装一份脚本；各版本共用全部适配器。

先预览再作答。本版与 Codex 共用共享答案校验和一次有界文本格式修正；无法回答时停止，不生成随机文本。已有人工内容仍受保护。

测试、预览、作答可能消耗账号积分。若要确认扣减，记录 WorkBuddy 用量页时间，单次测试后核对站点、模型和调用明细，不只看余额。原作者历史验收和本仓库模拟回归不代表每个账号的奖励积分或模型权限都已验证。

## 常见问题

未找到 CLI：检查第 1 步和 `XXT_CODEBUDDY_BIN`。已登录却要求登录：核对配置目录。图片失败：先用文字，图片另配接口。端口冲突：本地安装服务默认另用 18765；其他程序占用时，可用 `XXT_CODEBUDDY_PORT` 换端口并同步面板。登录、积分和模型权限问题应由本人在官方页面确认。
