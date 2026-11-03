# 自定义 / OpenAI 兼容接口：操作流程

适用于第三方兼容 API、自建网关，以及 Ollama、LM Studio 等本地服务。**请先准备同一家服务提供的 Base URL、完整模型 ID 和 API Key，三者要配套。** 第三方平台的 Key 不应直接填入 DeepSeek、OpenAI 等官方预设地址。

快速跳转：[第三方或自建接口](#cloud-api) · [本机 Ollama](#ollama) · [22 种兼容工具](#compatible-tools) · [已保存接口如何修改](#saved-config) · [常见报错](#troubleshooting)

<a id="cloud-api"></a>

## 一、第三方平台 / 自建兼容接口

1. 在接口提供方的控制台或文档中找到：调用协议、基础地址、可调用的完整模型 ID、自己的 API Key。聊天网页地址和文档地址都不等于 API 地址；网页会员也不等于 API 权限。
2. 打开脚本面板，切换到 **接入 AI（自动答题）**，展开 **添加 / 编辑接口**。
3. 按下面的表格填写。选择自定义只提供手动配置入口，不会自动查询平台的模型或替你购买额度。

| 设置项 | 怎么填 |
| --- | --- |
| 服务商 | **自定义 / OpenAI 兼容** |
| 接口协议 | 文档注明兼容 Chat Completions 时，选 **OpenAI Chat Completions**；明确支持 Responses 时才选 **OpenAI Responses** |
| Base URL | 提供方给出的基础地址，保留必要的版本前缀；不带具体请求路径 |
| 模型 | 在“手动填写模型 ID”中粘贴完整 ID，包括组织前缀、冒号后的标签等；不要只填品牌或显示名称 |
| API Key | 该地址所属平台的 Key，不加 `Bearer`、引号或空格；脚本会生成鉴权请求头 |
| 推理设置 | 先保持模型默认值；仅在提供方确认支持时再调整 |
| JSON 模式 | 首次配置先不勾选，避免网关不支持该参数 |
| 这个接口用于 | 先选 **文字题**；确认具体模型支持图片并测试后，再选 **文字题＋图片题** |

**Base URL 要填到哪一层？** 以下域名只是格式示例，不能直接当作可用服务。

| 文档中的完整请求地址 | Base URL 应填 | 协议 |
| --- | --- | --- |
| `https://api.example.com/v1/chat/completions` | `https://api.example.com/v1` | OpenAI Chat Completions |
| `https://api.example.com/api/v3/chat/completions` | `https://api.example.com/api/v3` | OpenAI Chat Completions |
| `https://api.example.com/v1/responses` | `https://api.example.com/v1` | OpenAI Responses |

脚本会按协议追加请求路径。不要把 `/chat/completions`、`/responses` 或模型查询接口一起填入 Base URL，也不要随意删掉提供方要求的 `/api/v3` 等前缀。“兼容 OpenAI”不代表同时支持以上两种协议。

4. 点击 **保存设置**，展开 **已保存接口**，确认刚保存的配置已选为 **用于文字 ✓**。如果只选“仅保存”，它不会成为当前作答接口。
5. 点击 **测试 AI**，按油猴提示允许对所填地址的访问。测试会调用已选用途的模型，云接口可能计费。若同时分配了旧图片接口，图片测试仍针对那个旧接口，请核对用途选择。
6. 文字测试通过后，再按实际需要配置图片用途并测试；文字通过不代表图片也支持。设置和保存本身不会调用模型。

<a id="ollama"></a>

## 二、本机 Ollama

下面针对 **课程浏览器与 Ollama 在同一台电脑上、使用标准本地服务** 的情况。Ollama 云端或额外加了鉴权的代理应使用自己的地址和真实 Key，不套用这里的占位值。

1. 保持 Ollama 服务运行。在 PowerShell 中执行只读命令：

```powershell
ollama list
```

复制列表中准备使用的完整 **NAME**，包括冒号后的标签；如果列表为空，需要先按 Ollama 官方说明准备模型。

2. 在同一台电脑的浏览器打开 [本机模型列表](http://127.0.0.1:11434/api/tags)。正常应显示模型列表数据；打不开时先检查 Ollama 服务，不要反复修改脚本 Key。列表能打开，只能证明服务可访问，不能证明模型推理已成功。
3. 在 **添加 / 编辑接口** 中填写：

| 设置项 | 填写内容 |
| --- | --- |
| 服务商 | **自定义 / OpenAI 兼容** |
| 接口协议 | **OpenAI Chat Completions** |
| Base URL | `http://127.0.0.1:11434/v1` |
| 手动填写模型 ID | `ollama list` 的完整 NAME，原样粘贴 |
| API Key | `ollama`，不要留空。标准本地 Ollama 不验证此占位 Key，但脚本要求非空 |
| 推理设置 / JSON 模式 | 保持默认 / 首次不勾选 |
| 这个接口用于 | 先选 **文字题** |

4. 保存，确认 **用于文字 ✓**，再点 **测试 AI**。首次加载本地模型可能较慢；若失败，保留完整错误提示并检查 Ollama 服务输出。
5. 只有部署的具体模型支持图片输入时，才设置图片用途并单独验证；文字模型不会因为选了图片用途就获得识图能力。

**不要选择“本地 Codex”，也不要把本地 Qwen 模型填进“通义千问 / 百炼”的云预设。** 这两项对应不同服务。这里填的是本机的 `/v1` 兼容地址，不能填 Ollama 原生 `/api/chat`。

本脚本只允许本机回环地址使用 HTTP；另一台电脑的 `http://192.168.…` 等远程 HTTP 地址不受支持。打开本机列表失败或服务关闭时，已保存的配置本身不会使服务继续运行。

<a id="compatible-tools"></a>

## 三、还有哪些工具可以这样接入？

下表整理 **22 种常见本地服务、推理引擎和网关**，均从各自官方文档或源代码核对兼容入口。生态还在变化，这不是所有软件的穷尽清单，也不代表已逐个安装或实测推理。**先启动工具的 API 服务并加载模型，再按第一节保存、选择用途和测试。** 仅打开聊天窗口通常还不够。

以下统一选择 **自定义 / OpenAI 兼容 → OpenAI Chat Completions**。表中回环地址假设浏览器与服务在同一台电脑，端口是官方示例或明确指定的示例；**实际端口、Docker 映射、API 前缀以自己的服务设置和启动输出为准**。不要同时启动多个占用同一端口的服务。

### 桌面本地工具

| 工具 / 官方操作说明 | Base URL 示例 | 启动与填写要点 |
| --- | --- | --- |
| [Ollama](https://docs.ollama.com/api/openai-compatibility) | `http://127.0.0.1:11434/v1` | 保持服务运行；模型填 `ollama list` 的完整 NAME；标准本地无鉴权时 Key 填 `ollama`，详见上节 |
| [LM Studio](https://lmstudio.ai/docs/developer/openai-compat) | `http://127.0.0.1:1234/v1` | 在 Developer 启动本地服务器；填服务器提供的模型 ID；启用 [Require Authentication](https://lmstudio.ai/docs/developer/core/authentication) 后必须填其 API Token |
| [Jan](https://docs.jan.ai/desktop/api-server) | `http://127.0.0.1:1337/v1` | 在 Local API Server 配好默认模型并启动；填写该模型 ID；设置了 API Key 就填写同一 Key，没有设置时按下文无鉴权规则填写 |
| [GPT4All](https://docs.gpt4all.io/gpt4all_api_server/home.html) | `http://127.0.0.1:4891/v1` | Settings → Application → Advanced 中启用 Local API Server；选择已安装可用模型，填服务接受的 ID；支持范围以其 API 文档为准 |

### 自建推理服务

这些工具主要面向自己部署模型的用户，部分有 Linux、GPU 或 Apple Silicon 等运行要求；已经运行的服务仍可按同一套脚本字段连接，安装过程请看对应官方说明。

| 工具 / 官方操作说明 | Base URL 示例 | 启动与填写要点 |
| --- | --- | --- |
| [llama.cpp / llama-server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) | `http://127.0.0.1:8080/v1` | 这里假设显式设置 `--port 8080`，不把它当成所有版本默认值；模型填服务模型 ID / 配置别名；若启用 `--api-key` 则填该 Key |
| [vLLM](https://docs.vllm.ai/en/stable/serving/online_serving/openai_compatible_server/) | `http://127.0.0.1:8000/v1` | 启动 `vllm serve`；填已部署模型 ID 或服务别名；配了 `--api-key` 就填对应 Key |
| [SGLang](https://docs.sglang.io/docs/basic_usage/openai_api_completions) | `http://127.0.0.1:30000/v1` | 启动兼容服务器；模型填已部署模型 ID；Key 与自己的服务器鉴权配置一致 |
| [LocalAI](https://localai.io/docs/index.print.html) | `http://127.0.0.1:8080/v1` | 启动 LocalAI 并安装模型；模型用其模型配置名称；有 API Key / 用户鉴权时使用实际 Key |
| [LMDeploy](https://lmdeploy.readthedocs.io/en/latest/llm/api_server.html) | `http://127.0.0.1:23333/v1` | 启动 `lmdeploy serve api_server`，示例指定端口 23333；模型填服务返回的 ID；按部署配置提供 Key |
| [Xinference](https://inference.readthedocs.io/en/latest/getting_started/using_xinference.html) | `http://127.0.0.1:9997/v1` | 启动服务并 launch 模型，填实际 model UID；Docker 的主机端口可能不同；鉴权按部署配置填写 |
| [FastChat](https://github.com/lm-sys/FastChat/blob/main/docs/openai_api.md) | `http://127.0.0.1:8000/v1` | controller、model worker 和 OpenAI API server 都要运行；填 worker 对外提供的模型名称 |
| [MLX LM](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/server.py) | `http://127.0.0.1:8080/v1` | Apple Silicon 用户启动 `mlx_lm.server`；填加载的模型 ID / 路径；不是 Windows 本地安装方案 |
| [Transformers serve](https://huggingface.co/docs/transformers/serve-cli/serving) | `http://127.0.0.1:8000/v1` | 启动其服务模式，使用它支持的模型 ID；不是直接填写 Hugging Face 模型网页地址 |
| [text-generation-webui](https://github.com/oobabooga/text-generation-webui/blob/main/docs/12%20-%20OpenAI%20API.md) | `http://127.0.0.1:5000/v1` | 用 `--api` 启用 API，端口看 `--api-port`；网页聊天端口不等于 API 端口；设置了 `--api-key` 就填该 Key |
| [KoboldCpp](https://github.com/LostRuins/koboldcpp/wiki) | `http://127.0.0.1:5001/v1` | 加载模型并保持服务运行，使用其 OpenAI 兼容入口；端口与鉴权看实际设置 |
| [TabbyAPI](https://github.com/theroyallab/tabbyAPI/blob/main/config_sample.yml) | `http://127.0.0.1:5000/v1` | 服务默认启用鉴权，填写自己的 API Key；加载模型且配置可用聊天模板；[兼容路由](https://github.com/theroyallab/tabbyAPI/blob/main/endpoints/OAI/router.py)支持 Chat，不要用管理员密钥替代普通调用密钥 |
| [TGI / Text Generation Inference](https://huggingface.co/docs/text-generation-inference/messages_api) | `http://127.0.0.1:3000/v1` | 此端口沿用官方 Messages API 客户端示例；服务必须支持该接口并加载聊天模型；托管部署则填实际 HTTPS 地址和访问 Token |
| [TensorRT-LLM / trtllm-serve](https://nvidia.github.io/TensorRT-LLM/commands/trtllm-serve.html) | `http://127.0.0.1:8000/v1` | 启动兼容 HTTP 服务；模型填已加载的 ID；运行环境与 Key 依部署而定 |

### 聚合网关和带 API 的应用

| 工具 / 官方操作说明 | Base URL 示例 | Key / 模型怎样对应 |
| --- | --- | --- |
| [LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/quick_start) | `http://127.0.0.1:4000` | 官方快速示例使用这个根地址，脚本追加 `/chat/completions`；有鉴权时填网关签发的调用 Key，模型填网关 `model_name` 别名 |
| [Open WebUI](https://docs.openwebui.com/reference/api-endpoints/) | `http://127.0.0.1:3000/api` | **这里是 `/api`，不是统一套 `/v1`**；启用账号 API Key 权限，填账号生成的 Key 与可访问模型 ID；脚本最终请求 `/api/chat/completions` |
| [One API](https://github.com/songquanpeng/one-api/blob/main/README.en.md) | `https://your-gateway.example/v1` | 地址换成自己的网关；Tokens 页面创建调用令牌，模型填该令牌可用的网关模型 ID；[路由依据](https://github.com/songquanpeng/one-api/blob/main/router/relay.go) |
| [New API](https://docs.newapi.pro/zh/docs/guide/feature-guide/user/api) | `https://your-gateway.example/v1` | 地址换成自己的网关；使用网关签发的 API Key 和授权模型 ID；不要直接拿上游渠道 Key 填到网关地址 |

**无鉴权的本机服务：** 本脚本仍要求 Key 非空，可填一个客户端占位值（如 `local`）。这只适用于你确认没有启用鉴权的本机服务；启用了鉴权就必须填实际 Token，不要为适配脚本去关闭鉴权。Ollama 的专用示例使用 `ollama`。以上软件若接在反向代理后面，使用代理实际提供的前缀与 Key。

**通用核对办法：** 找到服务文档中的完整 `…/chat/completions` 地址，把最后的 `/chat/completions` 去掉就是本脚本的 Base URL。模型优先复制服务模型列表返回的 `id`，或其配置中明确对外提供的名称；不要拿本地模型文件的显示名、上游品牌名替代。

如果使用的是 OpenRouter、Together、Groq、Fireworks、DeepInfra、魔搭等云端兼容接口，操作也按第一节执行：从**该平台当前文档**复制地址、模型 ID 和该平台 Key，不套用本机端口，也不假定每个平台都支持图片、Responses 或相同推理参数。云平台示例仅说明归类，本表没有逐家核对其完整模型能力。

Cherry Studio、Chatbox、SillyTavern 等通常作为 API 客户端使用；只有你确实启用了某个工具对外提供的兼容 API 服务，才能把那个服务地址填给脚本。Dify、FastGPT 等应用自身的工作流 API 也不能直接当成 Chat Completions；需要其明确支持兼容协议的入口或适配层。

<a id="saved-config"></a>

## 四、已保存的配置怎么改

展开 **添加 / 编辑接口**，重新填写目标服务的地址和模型。编辑相同服务时，Key 留空只会在提供方、协议和基础地址与当前编辑项相符时沿用原 Key；切换服务或地址后，请重新填入对应 Key。

点击 **保存设置** 后，到 **已保存接口** 核对新配置已用于文字 / 图片，再点 **测试 AI**。旧配置可在确认新配置有效后删除；不要只修改输入框就直接测试，因为测试读取的是已保存并分配用途的接口。

文字接口测试通过后，模型名包含可识别的品牌（如 `qwen`）时会自动匹配对应 AI 主题。自定义别名没有品牌特征时可能保留默认主题；主题不是接口可用性或图片能力的证明。

<a id="troubleshooting"></a>

## 五、常见报错：按顺序自查

| 提示 | 优先检查 |
| --- | --- |
| 请填写 API Key | 云服务填该平台 Key；标准本地 Ollama 填 `ollama` 占位，不留空 |
| 401 / 密钥验证未通过 | Key、基础地址和模型是否来自同一家服务；Key 是否失效；保存后是否仍选中了旧配置。先查鉴权，不能仅凭 401 就判断余额不足 |
| 403 / 拒绝访问 | 提供方的账号权限、地域或模型授权；仅凭状态码不能确定唯一原因 |
| 404 / 未找到接口或模型 | 基础地址的前缀、协议、完整模型 ID；不要重复填写请求路径 |
| 400、422 / 参数不接受 | 模型 ID 与协议；推理保持默认，关闭额外 JSON 模式后重新保存测试 |
| 429 / 请求受限 | 提供方的频率或额度限制，查看控制台说明后稍后再试 |
| 超时或连接失败 | 网络、油猴对目标地址的授权；本机服务是否仍运行、模型是否已加载。不要把浏览器打开模型列表当成推理成功 |
| 文字成功、图片失败 | 图片用途是否选对配置，具体模型和该网关是否接收图片；不支持时保留文字用途，另配图片接口 |

需要反馈时，提供 **脚本版本、服务类型与工具名称（第三方 / 本机服务）、脱敏设置截图、完整错误提示**；本机 Ollama 可附 `ollama list` 结果。**真实 Key 请完全遮住，不要发送给作者或贴在 Issue。**

## 依据与验证范围

- [Ollama 官方 OpenAI 兼容说明](https://docs.ollama.com/api/openai-compatibility)：本地兼容地址与占位 Key。
- [Ollama 官方模型列表接口](https://docs.ollama.com/api/tags)：本机模型查询。
- [OpenAI 官方 Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create) 与 [Responses 迁移说明](https://developers.openai.com/api/docs/guides/migrate-to-responses)：协议和请求路径的区别。
- 本页与脚本当前的字段、保存/用途和鉴权逻辑核对；链接、显示与模拟配置通过隔离浏览器验证，不代表已在反馈用户的电脑或第三方服务上实测连接。

[返回 README](../README.md) · [全部服务商配置](PROVIDERS.md)
