# 来源与许可

本项目的视频控制代码基于 [chaolucky18/xuexitongScript](https://github.com/chaolucky18/xuexitongScript) 修改，另增加了页面适配、学习流程、AI 接口和界面。

2026-10-15 检查上游仓库页面和项目文件时，未发现 LICENSE 文件。项目保留上游归属，未为整个衍生项目添加 MIT 或 Apache 许可证。

**上游代码的再分发许可尚未确认。** 公开可见不等于可以自由再许可；公开上传或再分发衍生文件前，应确认上游允许的范围或取得授权。未确认许可范围前，应将源码用于本地审阅。此状态不代表已确认禁止发布，也不代表授权已经取得。

仓库提供的 AI 接口和界面代码不包含私人提示词、连接令牌或私人测试内容。仓库在 GitHub 上公开可见，不代表上游授权已核实，也不构成对整个项目的开源再许可。

第三方库：

- jQuery 3.6.0：MIT，许可证见 `vendor/jquery.LICENSE.txt`。
- html2canvas 1.4.1：MIT，许可证见 `vendor/html2canvas.LICENSE`。

若要为整个项目选择开源许可证，需先明确上游文件与新增文件的权利范围。本说明不能替代所需授权。

可选奶龙和奶蛙主题使用的角色图片另列于 [主题素材说明](assets/themes/README.md)，不属于项目代码许可范围。

1.1.0 的分流、批次、诊断和集中补做设计参考了 [zhu-hailin/chaoxing-ai-assistant](https://github.com/zhu-hailin/chaoxing-ai-assistant/tree/343ee48228f5109b2be7ccddc1449cc8e3842ebd)。审阅时未发现该仓库的项目级许可证，因此本项目独立实现这些设计，没有复制其业务源码。1.2.0 为修复替换字体分流，直接从独立上游引入固定版本的 MIT 字体解析依赖，未使用对方打包实现。该说明不改变上述既有上游代码的许可边界。

## 字体解析依赖（1.2.0）

1.5.15 的课程队列、待刷目录和可选页面隐藏参考了 [zhu-hailin/chaoxing-ai-assistant](https://github.com/zhu-hailin/chaoxing-ai-assistant/tree/9f27234cfe4b1e00ffa75cf0c29473402ad06ca5) 的交互组织，按本项目控制流程独立实现。当前参考提交包含 MIT 许可；这与前文旧提交的历史核查不是同一次状态。未复制其业务模块、安装按钮或截图，也未引入第二个参考项目的答题实现，不改变本项目整体的既有许可说明。

Typr.js、Typr.U.js 直接取自 Photopea 上游固定提交；JavaScript-MD5 取自 blueimp 2.19.0。源码字节与 SHA-256 均记录在 [依赖清单](vendor/font/manifest.json)，对应完整 MIT 许可证保留在同目录并嵌入构建。项目自写字体读取、校验与分流逻辑，不复制参考项目的业务实现。固定字形字典由 forestpolice.org 提供，运行时只读 JSON，不随仓库重分发，网络与缓存范围见[隐私说明](docs/SECURITY.md)。

## AI 角色和品牌图标（1.3.0）

原角色设计作者为 B 站 UP 主 [ZipZipPipe](https://space.bilibili.com/4168597)。角色为参考其形象后生成的界面素材，来源、生成记录和适用说明见 [角色图鉴](docs/THEMES.md) 与 assets/personas。模型品牌图标来自 LobeHub/lobe-icons，MIT 完整许可见 assets/model-icons/LICENSE.txt，固定提交和文件哈希见 manifest.json。品牌及原角色权利仍归各权利人，不代表官方合作。

## 本仓库的整理与新增适配

此仓库由 cc66611 保存并维护仅任务点定制版，基于 Flyer2333/xuexitong-ai-assistant 的 8b58f328455fbbad38d75399120d804803eb5a8d 快照及本地 1.7.7.7 修改。原 README 保留为 docs/UPSTREAM_README.md，原安装与使用文档仍保留在 docs/。新增教程参考这些原始说明并针对本版改写。

排序/连线控件适配参考 iPycc/Fk-Chaoxing-Extension（3b367c2e8a4b986d303f45d2c274284404d2a348），完整 MIT 许可见 vendor/fk-dropdown-LICENSE.txt；阅读/完形子题遍历参考 ocsjs/ocsjs（a389cacc3cd3cd86ebd7cef6552188fb6ec27e98），完整 MIT 许可见 vendor/ocs-LICENSE.txt。来源注释和许可证同时保留在构建文件中。

上述部分的 MIT 许可不覆盖前文未确认的既有代码或角色素材。没有为整个衍生项目另行授予开源许可证。
