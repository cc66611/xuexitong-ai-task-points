## 1.7.7 WorkBuddy 模型选择（2026-10-29）

CodeBuddy / WorkBuddy 不作为新的云端模型目录：模型沿用官方 CLI 账号设置，`XXT_CODEBUDDY_MODEL` 应填写该账号实际可用的完整 ID。原有 10 家目录及参数保留；未逐模型付费调用，也未全面确认账号或地域权限。

## 1.7.6 来源初步复核（2026-10-29）

本次对10家服务商的41个登记来源重新发起请求；40项原生请求返回HTTP 200，Claude模型总览原生请求超时后通过官方网页补读。对响应自动搜索已登记ID和参数线索，暂保留70个对话模型与现有映射；部分页面可能只返回动态页面壳，未穷尽各页面内容、关联退役公告、账号/地域权限或付费推理，不将HTTP成功、检索记录或结构检查视为逐模型实调。原始响应和初步索引保存在本地候选 `artifacts/homework-choice-fix/model-sources`。

## 1.7.5 发布复核（2026-10-28）

发布前重新请求10家服务商全部41项登记官方来源。33项原生正文可读；OpenAI的6项来源原生请求遇到403，已通过同一官方网页补读目录、更新/下线公告、GPT-6指南及Sol/Terra说明。豆包模型列表与发布公告本轮仅返回页面壳，网页补读仍失败或无正文；其推理文档中的登记ID可读，但不能代替完整模型列表/公告核实。保留70个对话ID、手动输入与现有协议参数映射，不凭名称增删型号。未穷尽关联退役公告、账号/地域权限或付费推理。原始请求、逐页片段和网页补读记录保存在本次发布验证资料中；结构检查不代表真实模型调用。

## Issue #7 本地维护复核（2026-10-28）

重新请求10家服务商全部41项登记官方来源：41项HTTP 200，其中40项正文可读；豆包模型列表只返回页面壳，官方网页补读也没有列表正文。已读取其发布公告与推理说明中的登记ID；保留70个对话ID和已有参数映射，没有凭名称追加型号。未穷尽各页关联的退役公告，也未验证账号/地域权限或付费推理，不能据此声称所有模型生命周期已全面核实。逐页原始资料与片段保存在本地维护验收证据中。本地候选基于1.7.4，GitHub正式版仍为1.7.4。

## 1.7.4正式发布复核（2026-10-27）

本轮重新读取10家服务商的41项登记官方来源，41项HTTP完整可读。逐家比对已收录模型ID及可读推理参数片段，保留70个对话ID和原协议映射；继续使用托管平台自己的ID，保留自定义输入。未做付费推理、完整关联退役清单或账号/地域权限验证。本次实际下载安装审计另存发布报告。

# 模型目录与推理设置

## 1.7.3正式发布复核（2026-10-27）

发布前再次读取10家服务商的全部41项登记来源：39项原生HTTP完整可读；OpenAI下线公告和Z.AI GLM-5.3说明两页原生超时后，通过官方网页补读。逐家比对本轮已收录ID与可读推理参数片段，70个快捷ID及协议映射保持不变。GLM-5.3的enabled及low/high/max与现有映射一致；OpenAI目录/公告及Terra资料沿用本轮实读依据。没有调用付费模型，完整关联退役清单、账号及地域权限仍未全面验证。发布前正式1.5.6实际安装/源码与README入口审计通过；1.7.3发布后另做实际下载核对。

## 1.7.3本轮核对（2026-10-27）

课程目录浮窗及空白章节按钮修补时，重新读取全部41个登记来源：40项原生HTTP完整可读，小米中文模型发布页超时后web补读。逐家比对已收录ID与可读推理参数片段，保留70个对话ID及映射；版本元数据同步1.7.3。未做鉴权/付费推理，完整关联退役、账号和地域权限未全面核实。正式1.5.6的安装与源码等实际入口本轮重新下载核对通过，本地修补未发布。

## 当前候选核对：1.7.2 / 2026-10-27

同日将README开头预览改为默认主题“山行”时，再次读取41个配置来源：40个原生HTTP完整可读，小米Chat Completions参数页超时后通过官方网页补读，确认既有三款V2.6模型及thinking.type的enabled/disabled取值。逐家比对本轮目录ID和参数片段后保持70个ID与映射不变；没有模型调用，关联完整退役和账号/地域权限的未核范围不变。

本轮重新读取全部服务商配置的官方目录、公告与参数来源。OpenAI官方10月26日公告和模型页确认新增 gpt-6.1-terra，支持文本/图片输入与文本输出，effort为none/low/medium/high/xhigh/max；沿用已有OpenAI协议映射，没有替换用户已保存模型。官方来源：https://developers.openai.com/api/docs/models/gpt-6.1-terra 及 https://developers.openai.com/api/docs/changelog 。其他平台本轮读取的结果、限制和数量见下方完成记录；结构检查不等于联网核查。

本轮最终候选再次实时读取41个配置来源：40个原生HTTP完整可读，小米英文模型发布页超时后通过web完整补读。十家已收录ID及可读推理参数逐家复核，70个快捷ID保留；新增Terra的参数映射已经通过结构与请求构造回归。原始响应/片段在本地验收证据中保存，既有手动ID不覆盖。

本轮没有逐一调用所有模型，也没有全面确认各账号/地域权限及页面链接的全部关联退役公告。结构检查与读取网页不代表模型在用户账号下可调用。小米补读来源：[Model Release](https://mimo.mi.com/docs/en-US/updates/model)。

## 合并来源的历史核查：1.5.16 / 2026-10-27

撤去人物占位、恢复按钮对齐时再次请求40个来源，37个完整可读，Kimi推理说明及火山目录/推理两个入口超时。可读目录和片段逐家复查后保留69个ID及参数；超时入口不按本轮完整成功计数，完整关联退役及账号/地域权限仍未核实。本次证据为本地artifacts/compact-portrait-r5/model-sources。

背景人物避让修订时再次请求40个来源，36个完整可读，硅基流动接口文档及火山三个入口超时；这些入口沿用同日上轮证据，不能视为本轮完整复核。逐家查看可读ID和参数片段后保持现有目录不变，未增加模型、未调用真实推理。证据为本地artifacts/portrait-clearance-r4/model-sources；完整关联退役和账号/地域权限仍未核实。

随后删除README介绍卡、缩小安装按钮并生成全主题预览时，同日再次请求上述40个官方来源，结果仍为39个完整可读、火山目录超时；逐家核对可读ID和参数片段，模型目录未变。本次证据为本地artifacts/readme-feedback-r3/model-sources，未核范围沿用下述说明。

同日按用户反馈调整README和移除考试占位入口时，再次读取全部40个配置来源：39个完整返回200，火山模型目录两次读取超时（第二次收到部分200正文，未按完整成功计数）；另两个火山来源可读。逐家复查已收录ID与可读参数片段，保留原69个ID和参数，未增加模型。本次证据在本地artifacts/readme-feedback-r2/model-sources；超时入口及全部关联退役、账号/地域权限仍未完整核实。

布局与文案更新时再次重新下载十家配置的全部40个官方来源，逐家核对已收录ID与可读的目录、更新、下线和推理说明；原始响应及片段保存在本地验收产物的model-sources。目录现有69个快捷ID，手动输入和既有自定义配置保留。

| 服务商 | 本次处理 |
| --- | --- |
| OpenAI | 核对Astra、6.1 Sol、Sol、Luna及effort差异，保留已有ID与参数。 |
| Claude | 当前目录及effort文档仍列Fable 5.1、Opus/Sonnet/Haiku 5.5；保留映射。 |
| Gemini | 核对3.8 Flash、4 Argon及旧型号迁移说明；保留已有账号/预览版范围提示。 |
| DeepSeek | 确认Flash调用ID不随1017升级变化；保留none/low/high/max映射。 |
| 小米 | 确认2.6及UltraSpeed，2.5已于10月21日下线；保留权限提示。 |
| Kimi | 确认K3.1/K3/K2.7/K2.6与K2系列新账号限制、计划退役说明。 |
| 智谱 | 核对GLM-5.3/Flash/FlashX和推理设置；套餐与平台权限仍需用户自查。 |
| 百炼 | 核对当前目录、上架及思考/Omni说明；使用百炼实际ID，不照搬原厂名称。 |
| 火山 | 三个入口本次返回正文；复核已收录的官方实际ID kimi-k3-1-pro-261024，支持图文，推理设置暂沿用服务端默认，不猜测原厂映射。 |
| 硅基流动 | 确认平台组织/模型ID、1017升级不改ID及GLM-5.3的low/high/max；保留手动填写。 |

没有逐条核查所有关联退役公告、全部地域及账号权限，也没有调用每个模型测试。页面返回200或出现ID不等于账号可用；未核实的完整退役清单及未列出的平台托管型号不作保证。下文为历史记录和逐家来源，旧日期不代表本候选核查日期。

## 历史核对记录

1.5.10 作业本地候选于2026-10-27重新打开十家配置的40个官方来源，并定向复核目录、推理参数及退役资料。保留68个快捷ID和已有映射，保留自定义输入；没有用原厂名称替换托管平台ID，也未根据显示名猜测参数。可读内容核对当前OpenAI/Claude/Gemini、DeepSeek、MiMo、Kimi、智谱、百炼及硅基流动已收录项。Kimi仍保留K2系列10月31日新账号限制和12月底计划退役说明；硅基GLM-5.3按平台官方说明保持文字能力与low/high/max。

本次火山三个来源只返回JavaScript空壳，无法完整复核；百炼关联公告完整退役ID清单、部分平台全部托管型号和独立完整退役范围未核实。以上范围保持既有配置，不能称为全面更新或保证全部ID可用。未验证任何账号权限、真实推理或付费调用。原始读取证据保存在本地artifacts/homework-20261026/model-audit-raw.json；下方逐家来源及历史记录继续保留。

目录核对日期：**2026-10-26**。面板先选择服务商，再从“模型”下拉框选择准确 ID；列表末尾有 **没有我要的模型，手动填写**。原有自定义 ID 会自动进入手动填写模式，不会被换成另一个模型。

本目录收录已核实、适合文本或图文问答的模型，不包含语音合成、图像生成、向量嵌入和专用工具模型，也不是每个账号的实时可用列表。模型权限、地域、套餐、预览版与下线时间仍以服务商控制台为准。切换选项不会联网或产生 API 费用；“测试 AI”和实际答题可能计费。

1.3.0 和 1.4.0 发布前分别于 2026-10-21 重新读取十家官方模型入口，并检查可读的发布、退役与推理参数资料；1.4.0 开发完成后再次复读全部入口，保留 **63 个快捷 ID**，未发现需要变更的已收录 ID；读取限制与下述记录一致。这不是各平台的完整目录，也未逐项付费调用。

本次读取了 OpenAI 目录、更新、弃用与 GPT-6 参数，Claude 目录、退役和 effort，Gemini 目录、更新、弃用和思考，DeepSeek 模型/Chat 参数/更新，小米目录/发布/下线/Chat 参数，Kimi 当前/历史型号与思考强度，智谱国内 Flash/FlashX 与国际 GLM-5.3，百炼目录/上下架/思考/Omni，以及硅基流动 Chat 参数/调整公告。小米 2.5 的公告下线时间为北京时间 10 月 21 日 10:00，继续不列入快捷选项；聚合平台的同名模型不直接套用原厂退役时间。

读取限制：火山三个目录/参数/发布入口返回 JavaScript 空壳，官方检索索引可交叉确认部分已收录 ID 与思考参数，但不足以证明完整目录没有变化；百炼独立下线页未返回可核对的清单，不能称完整退役检查通过。智谱、Kimi、硅基流动的独立完整下线范围也不能从本次可读资料全部确认。未核实部分保留已有 ID、手动填写与权限说明，不猜测新增或删除。

1.4.1 / 1.4.2 本轮于同日再次复读十家官方入口、更新/退役公告与推理参数；保留现有 63 个快捷 ID，不根据显示名称推测新增型号。MiMo 中文入口本次部分返回旧目录，补读英文发布页确认 V2.6 三个 ID；火山目录超时或返回 JavaScript 空壳，仅官方索引可确认部分型号和参数。百炼下线页本次可见公告链接，未逐条完成所有关联公告，不能声称完整退役核查。Kimi 思考模式入口超时，K3 强度及当前/历史型号页面可读。其余权限、地区与不可读范围仍按上文保留说明，没有逐个付费验证。

1.4.3 发布前于2026-10-21重新读取十家官方目录及可读的更新、下线和推理参数资料，保留63个快捷ID；本次未发现必须变更的已收录ID，不把示例或显示名称当成新ID。Kimi模型列表本次可读，确认K3/K2.7 Code/K2.6与旧系列退役提示；MiMo列表确认V2.6三个ID及V2.5已下线。OpenAI、Claude、Gemini、DeepSeek和GLM参数与现有映射相符。百炼本次另打开下线页关联的六则公告，但正文只返回标题、部分影响时间与通用页脚，仍无法逐项核对退役ID；火山目录、参数和发布入口仍为空壳或超时，官方检索索引只用于交叉确认部分型号。智谱与硅基流动独立完整退役范围也不能据此全部确认。读取限制保留，不宣称完整目录或账号可用性已全部核实，未逐项付费调用。

1.4.4 发布前于 2026-10-22 再次尝试读取全部十家 sources 中的官方目录、更新/下线与推理资料，并补读百炼六则退役公告和火山参数支持页。保留现有 63 个快捷 ID 与参数映射；可读资料未提供必须变更已收录 ID 的明确证据，不把显示名称、其他协议示例或控制台权限当作可用 ID。Kimi 当前型号及退役表、K3 强度可读，思考模式页本次超时；MiMo 2.5 下线与 V2.6 替换可核对。火山目录/发布页仍为 JavaScript 空壳，思考参数页部分正文可读；完整目录与下线范围未核实。百炼六则关联公告中四则仅标题/影响时间可读，两则超时，未取得完整退役 ID 清单；智谱等无独立完整退役清单的范围继续保留限制。未进行模型推理或付费验证。

1.4.5 发布前于同日再次尝试读取十家 sources 中的官方目录、更新/下线与推理参数入口，并单独核对 GPT-6 Luna 官方规格：支持图片输入及 low 推理强度。保留 63 个快捷 ID 与既有参数映射；这不是账号权限或真实模型识别验证。部分入口可能返回导航、JavaScript 页面或超时，无法完整核对的目录与退役范围继续保留上文限制，不据此猜测新增/移除型号。

1.4.6 发布前于 2026-10-22 再次尝试读取全部十家 sources 的 40 项官方目录、更新/下线和参数入口，并核对可读的当前 ID、强度及下线表。保留 63 个快捷 ID 和既有协议映射；本次未发现需变更已收录项的明确证据。Kimi 思考页本次可读；火山三页仍为 JavaScript 空壳，硅基流动 Chat 参数入口两次超时，百炼关联下线通知及部分服务商完整退役范围仍未全部核实，不声称目录完整或账号可用性已验证。

1.4.7 发布前于同日再次检索十家 sources 的全部 40 项官方目录、更新/下线和参数入口，保留 63 个快捷 ID 与协议映射。Kimi 思考页和硅基流动 Chat 参数本次可读；火山发布页一度返回部分型号，复读又回到 JavaScript 空壳，目录页仍为空壳，思考页超时，不能证明完整目录或退役范围。百炼关联通知及部分服务商完整退役清单未逐项核实；维持手动填写、权限/地区说明，不把目录当实际调用验证。

1.4.8 正式发布前于 2026-10-22 再次读取十家 sources 的 40 项官方入口，核对已收录 ID 与可读的推理、发布及下线资料，保留 63 个快捷 ID 和原有参数映射。Kimi 思考页及硅基 Chat/调整公告本次可读；火山目录、思考及发布页本次均为 JavaScript 空壳，官方搜索索引只能补充部分资料。百炼机制页及相关通知、智谱等完整独立退役范围仍未全部核实；不声称完整目录更新或账号可用。目录为快捷选择，保留手动 ID；未调用模型。

## 各服务商目录与来源

1.4.2 上传前最后复查仍保留63个快捷ID。此次小米中文列表已明确展示V2.6与V2.5下线；Kimi思考模式及强度页可读，但模型列表入口超时；火山三个入口仍为JavaScript空壳；百炼下线页可见关联公告链接，未逐条打开完整清单。硅基流动10月21日公告说明DeepSeek-V4.1-Flash升级1017而调用ID不变。未把不可读范围写成完整核验，也未付费测试所有ID。

| 服务商 | 本次核查与收录范围 | 官方来源 |
| --- | --- | --- |
| OpenAI | GPT-6 Astra、6.1 Sol、6 Sol、6 Luna；使用 API ID，不使用 Codex 界面里的显示名称 | [模型目录](https://developers.openai.com/api/docs/models)、[GPT-6 参数](https://developers.openai.com/api/docs/guides/latest-model)、[GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol) |
| Claude | Fable 5.1、Opus/Sonnet/Haiku 5.5 | [模型 ID](https://platform.claude.com/docs/en/models/overview)、[effort](https://platform.claude.com/docs/en/build-with-claude/effort) |
| Gemini | Gemini 4 Argon（low/medium/high）、当前 Flash 与 Flash-Lite、仍列出的 Pro/Flash 预览版和 2.5 系列；旧账号限制见官方说明 | [模型目录](https://ai.google.dev/gemini-api/docs/models)、[思考参数](https://ai.google.dev/gemini-api/docs/generate-content/thinking)、[更新与弃用](https://ai.google.dev/gemini-api/docs/changelog) |
| DeepSeek | `deepseek-flash`、`deepseek-v4-pro`；Flash 为当前官方调用别名 | [模型列表](https://api-docs.deepseek.com/api/list-models/)、[更新](https://api-docs.deepseek.com/updates/)、[请求参数](https://api-docs.deepseek.com/zh-cn/api/create-chat-completion/) |
| 小米 MiMo | V2.6 Pro、Flash、Pro UltraSpeed；即将下线的 2.5 系列不作为快捷选项 | [模型目录](https://mimo.mi.com/docs/zh-CN/quick-start/summary/model)、[Chat API](https://mimo.mi.com/docs/zh-CN/api/chat/openai-api)、[模型更新](https://mimo.mi.com/docs/zh-CN/updates/model)、[英文发布记录](https://mimo.mi.com/docs/en-US/updates/model)、[下线公告](https://mimo.mi.com/docs/zh-CN/updates/deprecate) |
| Kimi | K3、K2.6、K2.7 Code 及高速版；不再列出已下线的 K2.5/moonshot-v1 | [模型目录](https://platform.kimi.com/docs/models)、[思考模式](https://platform.kimi.com/docs/guide/use-thinking-models)、[K3 强度](https://platform.kimi.com/docs/guide/use-reasoning-effort)、[官方故障排查](https://www.kimi.com/help/kimi-api/api-troubleshooting) |
| 智谱 GLM | `glm-5.3`、`glm-5.3-flash`、`glm-5.3-flashx`；Flash/FlashX 原生支持图片，参数与 5.3 一致，不能关闭思考，需匹配 API 权限 | [国内目录](https://docs.bigmodel.cn/cn/guide/models)、[GLM-5.3 官方说明](https://docs.z.ai/guides/llm/glm-5.3) |
| 千问 / 百炼 | 已核实的 3.8/3.7/3.6/3.5 系列和 VL，新增 27B、2.4T-A95B、Omni Flash；托管第三方模型可手填 | [模型大全](https://help.aliyun.com/zh/model-studio/models)、[模型范围](https://help.aliyun.com/zh/model-studio/batch-inference)、[深度思考](https://help.aliyun.com/zh/model-studio/deep-thinking/)、[文本生成](https://help.aliyun.com/zh/model-studio/text-generation)、[上下架公告](https://help.aliyun.com/zh/model-studio/newly-released-models)、[Omni 参数](https://help.aliyun.com/zh/model-studio/qwen-omni) |
| 豆包 / 火山方舟 | 当前 Seed 2.1 Pro/Lite/Turbo、Evolving、2.0 Lite 及已核实的托管 DeepSeek/GLM；专属 `ep-` 接入点使用手动填写 | [模型目录](https://docs.volcengine.com/docs/ark/model-list?lang=zh)、[深度思考](https://docs.volcengine.com/docs/ark/deep-thinking?lang=zh)、[模型发布](https://docs.volcengine.com/docs/ark/model-release-announcement?lang=zh) |
| 硅基流动 | 已核实的 GLM、DeepSeek、Kimi、Qwen 托管 ID；保留组织前缀，不与原厂 ID 混用。国际与国内目录可能不同 | [调整公告](https://docs.siliconflow.cn/docs/release-notes/overview)、[GLM-5.3 部署说明](https://www.siliconflow.com/zh-tw/blog/glm-5.3-now-live-on-siliconflow) |

下线与限制核对：[OpenAI](https://developers.openai.com/api/docs/deprecations)、[Claude](https://platform.claude.com/docs/en/about-claude/model-deprecations)、[Gemini](https://ai.google.dev/gemini-api/docs/deprecations)、[千问](https://help.aliyun.com/zh/model-studio/model-depreciation)。当前 Gemini 2.5 系列仅部分原有账号可用；不因出现在列表就保证新账号能调用。DeepSeek 的新版本继续使用 `deepseek-flash` 别名，不把显示名拼成另一个 ID。

目录和具体 ID 保存在 [src/models.cjs](../src/models.cjs)，随脚本版本更新。服务商页面无法成功读取的部分会注明，不宣称全部型号均已核实或实测。

GPT-6 Sol 与 Luna 可选 none；Astra 与 6.1 Sol 不能关闭推理。依据各自型号页分别设置，不在整个 GPT-6 系列套用同一选项。

## 推理设置怎样适配

默认选择 **使用模型默认值（建议）**，不额外发送推理参数。高强度可能占用更多输出预算、增加费用和等待时间，不保证答案更正确。

| 服务商 / 模型 | 可选设置 | 实际请求参数 |
| --- | --- | --- |
| OpenAI 当前 GPT-6 | low / medium / high / xhigh / max；6 Sol 与 Luna 另有 none | Responses 的 `reasoning.effort`，或 Chat 的 `reasoning_effort` |
| Claude 当前目录模型 | low / medium / high / xhigh / max | 原生 Messages 的 `output_config.effort` |
| Gemini 4 Argon / 3.8 Flash | low / medium / high | `generationConfig.thinkingConfig.thinkingLevel` |
| DeepSeek 当前目录模型 | none / low / high / max | `reasoning_effort`，none 表示关闭思考 |
| 小米 V2.6 | 开启 / 关闭思考 | `thinking.type`，不发送 xhigh |
| Kimi K3 | low / high / max | `reasoning_effort`，不能关闭思考 |
| Kimi K2.6 | 开启 / 关闭思考 | `thinking.type` |
| Kimi K2.7 Code | 服务商默认值 | 始终思考，不发送关闭参数 |
| 智谱 GLM-5.3 / Flash / FlashX | low / high / max | `reasoning_effort`，不能关闭思考 |
| 当前目录的千问混合思考模型（不含 Omni） | 开启 / 关闭思考 | 顶层 `enable_thinking` 布尔值 |
| 千问 3.8 2.4T-A95B / 百炼托管 MiMo | 服务商默认值 | 2.4T 不能关闭思考；托管 MiMo 暂不猜测额外参数 |
| 千问 3.8 Omni Flash | none / minimal / low / medium / high / xhigh / max | Chat 顶层 `reasoning_effort`；minimal 映射 low，high/max 映射 xhigh，none 关闭思考 |
| 当前目录的豆包 Seed | 开启 / 关闭，或 none / minimal / low / medium / high / xhigh / max | 开关发送 `thinking.type`，强度发送 Chat 顶层 `reasoning_effort`，不同时发送；none/minimal 关闭，xhigh/max 映射 high |
| 火山托管 DeepSeek Flash / GLM Flash | 前者 none / low / high / max；后者 low / high / max | 平台实际 `reasoning_effort`；GLM 的低档不代表关闭思考 |
| 硅基流动 GLM-5.3 | low / high / max | 平台部署支持的 `reasoning_effort` |
| 其他未核实模型、不同协议组合 | 服务商默认值 | 不猜测兼容参数 |
| 自定义 Chat / Responses | 通用强度选项 | 由使用者确认网关支持范围 |
| 本地 Codex | 在连接服务中设置 | 面板不覆盖 CLI 模型或推理强度 |

更换模型、服务商或协议时会刷新选项并回到默认值；不会把上一家的 xhigh 自动带给下一家。旧版本保存了不兼容强度时，沿用模型和密钥，仅恢复推理默认值。

选择图片用途时，请核对模型图片能力。保存时明确选择文字、图片或两种用途；手动模型不会被擅自推断为视觉模型。即使目录标注支持图片，账号权限和输入格式仍可能限制调用。


1.4.10 发布前于2026-10-22重新尝试读取十家sources中的40个官方入口，并复核可读的目录、更新、下线与参数资料。按百炼上架公告补充 `MiniMax/MiniMax-M3.1-Flash`、`deepseek-v4.1-flash-1017`，按硅基流动升级公告补充 `deepseek-ai/DeepSeek-V4.1-Flash`，快捷ID共66个。上述新增托管模型尚未逐项核实强度参数，使用平台默认值，不照搬原厂映射；硅基新增项图片能力未从公告完整确认，保留用途确认。Kimi思考页超时、火山三入口空壳/读取错误，仅官方检索索引交叉确认部分参数；百炼六则退役通知中一则超时，其余只有标题或影响时间，完整退役ID清单仍未核实。其余已收录项保留现有映射；未验证账号权限或付费推理，完整目录与退役限制按前述说明保留。


1.4.10 于2026-10-23正式发布前再次读取十家sources的40个官方入口，并补读Claude更新记录、百炼MiniMax型号页/六则退役公告、火山最新型号与下线说明。复核可读的当前ID和协议参数后保留66个快捷ID及既有映射，新增托管型号仍使用平台默认强度。Kimi思考页本次可读；火山模型列表与思考映射本次取得正文，发布/下线页仍返回JavaScript空壳，官方检索索引只能补证部分范围。百炼六则退役公告四则超时、两则只有标题或影响时间，未取得完整退役ID清单；智谱等独立完整退役范围也未全部建立。目录不是账号实时可用列表，保留自定义ID和地区/权限说明；未调用模型或验证账号权限。


2026-10-25本批逐版本发布共同核查：重新读取十家sources全部40官方入口及定向参数、更新/退役资料；Kimi官方目录确认kimi-k3.1-pro和kimi-k3.1-pro-highspeed，前者图文且顶层reasoning_effort支持low/high/max，后者保留默认强度，不猜测映射。保留其他已收录ID/自定义输入，共68快捷ID。火山目录超时，思考/发布入口JavaScript空壳；百炼关联退役公告及部分厂商完整独立退役范围未全部确认，不声称完整目录、账号权限或真实模型推理已验证。

1.5.5 于 2026-10-25 再次读取全部十家 sources 的 40 个官方入口，并定向核对当前 ID、推理参数和退役信息；保留 68 个快捷 ID 与已有手动输入，不根据显示名猜测型号。Kimi 目录本次可读，补充 K2 系列 10 月 31 日起不向新账号开放、已有账号过渡的说明；法律专用等非通用模型不纳入目录。火山三个入口仍只返回 JavaScript 提示，百炼独立下线页未返回完整清单；其余平台未取得独立完整退役范围的限制继续保留。本次没有验证账号权限、逐模型推理或收费调用。

1.5.6 于 2026-10-25 再次尝试读取十家 sources 全部 40 官方入口，复用当日已核对的型号、参数与退役依据；可读来源未提供必须调整现有 68 ID 的新证据，保留原目录与手动 ID。火山目录/思考入口仅 JavaScript 提示、发布入口读取错误，百炼完整退役清单等未核范围保留；没有验证账号权限或付费推理。

1.5.7 于 2026-10-25 重新读取十家 sources 的全部 40 个官方入口，并定向复核当前 ID、推理参数和退役资料，保留现有 68 个快捷 ID 和协议映射。OpenAI、Claude、Gemini、DeepSeek、MiMo、Kimi、GLM、百炼和硅基流动的可读内容与当前收录项核对；Kimi 补充官方计划于 12 月底下线 K2 系列的说明，未提前移除仍在过渡期的型号。火山模型列表本次取得正文，思考和发布入口仍仅 JavaScript 提示；百炼下线机制页可读但关联公告的完整退役 ID 清单未全部核实，其他平台无独立完整清单的范围仍保留限制。本次没有验证账号权限或进行付费模型调用。
本地 1.5.7 追加绿色文案时，于同日再次读取上述十家 sources 的全部 40 个官方入口，沿用本轮可读型号/参数依据与未核实范围；没有新增或移除快捷 ID，也未进行模型调用。

1.5.8 讨论题候选于同日再次读取十家全部40个官方入口，并定向复核已收录ID、推理字段与下线表。保留68个快捷ID、协议参数及自定义输入；讨论沿用现有纯文字essay请求，不新增服务或权限。Kimi思考页本次超时，推理强度页可读；火山目录为JavaScript空壳，思考/发布页超时；百炼关联公告完整退役ID清单和其他平台未建立的完整退役范围仍未全部核实。目录结构检查、模拟模型回归不代表账号权限、真实模型判断或付费接口可用性验证。本轮未进行模型推理或付费调用。


1.5.8讨论默认AI修订于2026-10-26再次打开十家40项官方来源，并定向检查ID、推理参数及下线资料；保留现有68个ID和协议映射。Kimi思考页本次可读，K3三档强度、K2.7始终思考与K2.6开关和当前配置一致；保留10月31日起K2系列新用户限制及12月底计划下线提示。火山三入口均为JavaScript空壳，百炼关联公告完整退役ID与其他厂商完整独立退役范围未全部核实，不声称目录完整。没有真实模型或付费调用。原始读取结果见本地artifacts/discussion-20261025/default-ai-20261026。


1.5.11讨论灵活字数/原帖图片候选于2026-10-26重新打开全部10家40项sources，并定向26项ID/推理/退役资料；保留68ID及参数。OpenAI图像输入资料复核支持多张PNG输入，脚本复用已有视觉请求格式，没有新增协议或权限。Kimi思考页本次可读，火山三页为JavaScript空壳，百炼关联完整退役清单与部分厂商完整独立退役范围仍未核实，不声称目录完整或账号可用。原始证据在本地artifacts/discussion-flexible-20261026/flexOfficial*.json及flexFind.json；未调用付费模型。

## 1.5.13 本轮复核（2026-10-26）
重新打开登记的10家服务商40个官方入口，并对ID、推理参数、更新与下线记录做28项定向查找；保留68个ID。火山模型列表/思考页为JS空壳，更新公告超时；百炼为目录入口，完整关联退役清单及各账号地域权限未穷尽。未调用鉴权模型列表或付费推理，不承诺目录完整性。原始证据在本轮artifacts/model-open与model-find，结构检查不代替实调。



2026-10-27 本地1.5.14核对：本次只改变讨论页状态显示，无模型调用协议或目录ID迁移；按根目录更新规则重开全部40官方入口，实际读取与未核范围见候选验收报告。未以结构检查替代联网核查，未调用付费模型。
