# WorkBuddy 积分连接：CodeBuddy CLI

本功能从正式版 1.7.7 提供。请使用包含本文件的完整源码 ZIP；仅安装油猴脚本还不够。

连接方式为：学习通脚本 → 本机连接服务 → 官方 CodeBuddy CLI → 模型答案。官方国内站说明 CodeBuddy 和 WorkBuddy 同账号积分共享；国内站、国际站、企业账号请分别核对，不能跨站混用。具体奖励积分能否扣减、模型是否可用，以本人账号的真实调用和用量明细为准。

## 1. 准备电脑

需要 Windows、macOS 或 Linux，以及 Node.js 20.11 以上。在解压后的项目文件夹打开终端，先执行：

```powershell
node --version
npm --version
```

## 2. 安装官方 CLI

以下命令把 CLI 和 npm 缓存放在项目的私有目录，不会进入源码交付包：

```powershell
npm install --prefix ./src/local/codebuddy --cache ./src/local/npm-cache --no-audit --no-fund @tencent-ai/codebuddy-code@2.177.1
```

下载包含较大的依赖，首次安装可能需要较长时间。安装失败先保留终端错误，不要从别人处导入账号凭据。

已有官方 CLI 的用户也可继续使用自己的安装。若程序找不到它，可设置 `XXT_CODEBUDDY_BIN` 为官方 CLI 的实际入口文件或可执行文件的完整路径；Windows npm 的 `.cmd` 包装器会解析为实际 Node 入口，题目不会拼接到 shell 命令中。

## 3. 本人登录

```powershell
npm run login:codebuddy
```

按官方登录菜单选择与 WorkBuddy 相同的站点和账号，在官方浏览器页面完成登录。首次创建的 CLI 配置与登录状态保存在 `src/local/codebuddy-config`，与原桌面应用的登录文件分开。不要分享此目录。

如自己已有专用配置目录，可在登录和启动服务时都设置相同的 `CODEBUDDY_CONFIG_DIR`。登录与服务使用不同目录，会导致“已经登录但仍要求认证”。

## 4. 启动本地服务

```powershell
npm run start:codebuddy
```

默认模型交由 CLI 选择。若你的国内站账号可以使用 `glm-5.3-flash`，可在同一 PowerShell 窗口中这样启动：

```powershell
$env:XXT_CODEBUDDY_MODEL = 'glm-5.3-flash'
npm run start:codebuddy
```

在一次国内站账号的隔离页面验收中，这个模型通过了合成文字和数字图片测试；其他账号能否使用及真实题图能否识别，仍需各自测试。默认模型 `hy4-preview` 在该次文字测试中通过，图片测试未通过，原因尚未确定。也可以把上述 ID 换成你的账号确认可用的完整模型 ID。

面板不填写或覆盖模型。不要把模型显示名称、其他平台的 ID、WorkBuddy 积分数量当成模型 ID。

保持服务窗口开启。默认只监听本机 `http://127.0.0.1:18764`；端口被占用可先设置 `XXT_CODEBUDDY_PORT`，面板地址也须一致。原 Codex 服务使用 18763，两者不会共用连接码。

## 5. 配置学习助手

1. 将源码包的 `dist/xuexitong-ai-assistant.user.js` 完整覆盖到现有油猴脚本，保存并刷新具体学习页；确认版本 1.7.7 或更新版本。只启用这一份控制同一课程的脚本。
2. 打开“接口 → 添加 / 编辑接口”，服务商选择“本地 CodeBuddy / WorkBuddy”。
3. 默认协议为“本地 CodeBuddy / WorkBuddy”，Base URL 为 `http://127.0.0.1:18764`。
4. 打开 `src/local/codebuddy-token.txt`，复制完整连接码到“API Key / 本地连接码”。不要填写 WorkBuddy 密码、Cookie 或第三方 API Key。
5. 用途先选“文字题”，保存设置，再点“测试 AI”。本地服务健康检查之后，还会让模型实际回答一题随机计算；只启动了服务不会被当成文字验证成功。
6. 需要图片时，再设为“文字题＋图片题”并测试。图片使用随机数字图单独验证，文字通过不代表图片也支持。也可继续用原有其他服务商处理图片。

测试和答题可能消耗账号积分。“停止”会取消正在等待的模型请求；已经发生的计费是否退还由官方决定。文字与图片分别报告测试结果，图片失败不覆盖文字成功。CodeBuddy 不会被错误显示为 GPT 角色主题，原外观选择保留。

## 验收自己的积分

先在 WorkBuddy 官方“套餐与用量”中记下余额和时间，只执行一次文字测试，再查看新出现的模型调用明细。需确认调用账号、站点、模型、扣减类型及时间相符，不能只用余额变化推断。模型限免、入账延迟或奖励使用范围可能影响结果。

## 常见情况

| 现象 | 处理 |
| --- | --- |
| 未找到 CodeBuddy CLI | 完成第2步，或检查 `XXT_CODEBUDDY_BIN` 指向的实际入口 |
| 服务能连接，但文字测试失败 | 检查服务窗口；确认第3步登录成功、账号模型权限和积分，必要时换用账号已验证的模型 |
| 图片未通过 | 先使用文字题，图片另配已验证的视觉接口；不据文字成功猜测图片能力 |
| 地址不是 CodeBuddy 服务 | 核对18764端口与对应连接码；不能填Codex的18763和bridge-token.txt |
| 官方CLI提示参数不存在 | 更新至本教程所列版本；不要删掉权限限制参数来勉强启动 |
| 关闭服务窗口后不能用 | 在同一源码目录重新运行启动命令；连接码变化时重新保存面板配置 |

## 验证范围

隔离浏览器回归使用模拟课程和部分模拟响应。另用一个本人登录的国内站账号，通过真实官方 CLI、本地服务和测试版面板完成合成文字、图片测试，并在 WorkBuddy 明细核对到 CLI 的基础积分消耗；该账号的奖励积分没有实际扣减验收。上述结果不代表其他账号权限，也不代表真实课程填写、提交、任务点或实际成绩已经验证。

官方参考：[安装和登录](https://www.codebuddy.cn/docs/cli/quickstart)、[非交互调用与图片输入](https://www.codebuddy.cn/docs/cli/headless)、[配置目录](https://www.codebuddy.cn/docs/cli/env-vars)、[同账号积分共享](https://www.codebuddy.cn/docs/ide/Account/pricing)、[WorkBuddy用量查询](https://www.codebuddy.cn/docs/workbuddy/Usage)。
