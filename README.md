# 研程 GradFlow

研程是面向研究生的本地优先手机日程助手。它把课程通知、导师消息、聊天截图和纸面通知整理成可核对、可提醒、可追溯的日程。

当前版本：**v1.0.1**。项目以Android为发布平台；Web端用于界面和流程预览。

## 核心能力

- 今日、三天内、本周安排和月历视图；
- 手动新建、编辑、完成和删除事项；
- 系统日期选择器、系统时间选择器和`YYYY-MM-DD HH:mm`手动输入；
- Expo SQLite本地持久化；
- 本地通知和系统日历写入；
- 粘贴聊天或通知文字，设置消息发送时间以解析相对日期；
- 从相册选择最多5张截图，或拍摄纸面通知；
- 使用用户配置的EasyOCR云API识别图片；
- 使用用户配置的DeepSeek兼容API提取结构化日程；
- 候选事项逐条编辑、忽略、设置提醒和批量保存；
- 展示置信度、原文证据和待确认字段；
- 识别延期、改期、换地点和取消，并关联更新原事项；
- 保存事项变更历史，同步调整本地提醒；
- 检测重叠日程，并按事项类型或课程筛选；
- 导出、分享和粘贴恢复JSON备份。

## 产品原则

- 本地优先，不要求账号或云数据库；
- AI结果必须经过用户确认才能保存；
- 缺失信息不由模型擅自补全；
- 每项AI结论都保留原文证据；
- API Key只存放在设备SecureStore；
- 示例、测试和文档只使用虚构数据。

## 技术栈

- Expo SDK 56、React Native、TypeScript
- Expo Router
- Expo SQLite、Notifications、Calendar、SecureStore、FileSystem
- React Native Community DateTimePicker
- Zod
- Vitest、ESLint

## 环境要求

- Node.js 22.13或更高版本，推荐Node.js 24 LTS；
- npm；
- Android真机或模拟器；
- 完整通知验证需要Development Build或Release包。

## 快速开始

```bash
git clone https://github.com/domopy/gradflow-app.git
cd gradflow-app
npm install
npm run check
npm start
```

使用Expo Go扫码后，可调试界面、文字导入、图片压缩、EasyOCR和DeepSeek流程。新增原生依赖或修改权限后，应重新构建Development Build或Release包。

## 应用配置

项目不要求`.env`文件。打开应用“设置”页面填写：

- DeepSeek服务地址，默认`https://api.deepseek.com`；
- 模型名称，默认`deepseek-v4-flash`；
- DeepSeek API Key；
- EasyOCR服务地址，默认`https://console.easyocr.org`；
- EasyOCR Access Key；
- 图片保留策略。

密钥由用户自行提供并存入SecureStore，不进入SQLite、日志、备份或仓库。

## 使用流程

### 手动创建事项

1. 在“导入”页点击“手动添加”；
2. 填写标题和事项类型；
3. 使用“选日期”“选时间”，或手动输入`YYYY-MM-DD HH:mm`；
4. 设置地点、要求和提醒；
5. 保存事项。

开始时间和截止时间均可选。选择日期时会保留当前时间，选择时间时会保留当前日期；取消选择不会覆盖手动输入。

### 文字识别

1. 粘贴通知文字；
2. 核对消息发送时间；
3. 点击“开始识别”；
4. 在确认页核对候选事项、时间、提醒和原文证据；
5. 保存选中的事项。

### 图片识别

1. 从相册选择图片或拍摄通知；
2. 确认上传后，应用将压缩图片发送到EasyOCR；
3. EasyOCR返回的文字会发送到DeepSeek兼容接口；
4. 用户核对候选事项后决定是否保存。

默认在识别结束后删除临时图片。也可在设置中选择仅在应用私有目录保留压缩副本。

### 变更消息

识别到改期、延期、换地点或取消时，应用会提供已有事项作为关联候选。用户确认后更新原事项，并保存变更前后快照。取消事项会关闭原提醒；其他时间变更可保持或重新设置提醒。

### 备份与恢复

设置页可生成真正的`.json`备份文件并通过系统分享，也可从文件选择器读取备份。恢复采用整库替换策略，执行前会再次确认。备份不包含API Key、系统通知标识、系统日历事件ID和来源图片；恢复后需要重新设置系统提醒。

## 数据与隐私

- 事项、来源和变更记录保存在本机SQLite；
- 应用不会自动读取聊天记录或整个相册；
- 文字只在点击识别后发送到DeepSeek；
- 图片只在用户确认后上传EasyOCR；
- 通知和日历权限仅在用户主动使用相关功能时申请；
- 删除事项时同步处理关联提醒和无引用的本地图片；
- Web端仅用于预览，AI解析使用模拟数据。

详见[隐私说明](docs/privacy.md)和[安全策略](SECURITY.md)。

## 项目结构

```text
src/app/         Expo Router页面
src/components/  可复用界面组件
src/db/          SQLite迁移和Repository
src/providers/   状态与业务流程协调
src/schemas/     Zod运行时Schema
src/services/    AI、OCR、图片、通知、日历和备份服务
src/theme/       设计令牌
src/types/       领域类型
src/utils/       日期、冲突、提醒和变更逻辑
tests/           Vitest测试
docs/            架构、隐私和发布文档
```

页面不直接执行SQL。业务写入由Provider协调Repository、系统通知和日历服务。

## 开发命令

```bash
npm start          # 启动Expo开发服务器
npm run android    # 运行Android原生项目
npm run web        # 启动Web预览
npm run lint       # ESLint
npm run typecheck  # TypeScript检查
npm test           # Vitest
npm run check      # lint + typecheck + test
npm run verify     # check + Expo依赖检查 + 高危漏洞审计
```

导出Bundle：

```bash
npx expo export --platform android
npx expo export --platform web
```

Android签名构建：

```bash
npm run build:android:preview     # 内部分发APK
npm run build:android:production  # 商店AAB
```

首次使用EAS前需要执行`npx eas init`关联Expo项目，并在GitHub仓库配置`EXPO_TOKEN`。标签工作流会自动创建GitHub Release；配置令牌后还会启动签名AAB构建。

Android精确定时提醒需要`SCHEDULE_EXACT_ALARM`权限。修改原生依赖或权限后，Metro热更新不会生效，必须重新构建并安装应用。

## 测试与CI

业务逻辑使用Vitest覆盖日期解析、日期/时间选择合并、Schema、AI响应、OCR上传、图片处理、冲突检测、提醒和备份相关行为。GitHub Actions会在推送和Pull Request时执行：

- `npm ci`
- `npm run verify`
- Android和Web的Expo导出

## 已知限制

- 本地提醒在Expo Go中不可完整验证；
- 系统日期/时间选择器需在Android真机上完成最终视觉验收；
- EasyOCR和DeepSeek是外部服务，稳定性、额度和数据处理规则由服务提供方决定；
- `npm audit`可能报告Expo CLI依赖链中的中危告警，项目CI仅对高危和严重漏洞失败；
- 不应运行可能破坏Expo SDK版本约束的`npm audit fix --force`。

## 发布

发布前应运行`npm ci`、`npm run verify`并导出三端Bundle，同时检查仓库中不存在密钥、真实聊天记录、截图、数据库或构建产物。完整流程见[发布检查清单](docs/releasing.md)和[更新日志](CHANGELOG.md)。

## 参与贡献

提交Issue或Pull Request前请阅读：

- [贡献指南](CONTRIBUTING.md)
- [行为准则](CODE_OF_CONDUCT.md)
- [项目上下文](PROJECT_CONTEXT.md)
- [架构说明](docs/architecture.md)

## 许可证

本项目采用[MIT License](LICENSE)。第三方依赖和外部服务说明见[第三方声明](THIRD_PARTY_NOTICES.md)。
