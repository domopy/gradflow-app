# GradFlow 项目进度

更新时间：2026-06-22
当前版本：1.0.1
当前重点：Android Release真机验证与公开发布

## 1. 总体状态

GradFlow已经完成v1.0首个完整版本。当前项目具备本地日程、AI文字解析、截图导入、研究生日程变更识别、JSON备份恢复、EasyOCR云OCR，以及统一的日期/时间输入体验。

v1.0.1补齐Android构建配置、文件化备份、提醒诊断、系统日历同步和自动发布流程。下一步是使用签名APK/AAB完成真机闭环验证。

## 2. 已完成版本

### v0.1：本地日程

- 搭建Expo React Native + TypeScript工程；
- 使用Expo Router实现底部四页导航；
- 实现今日页、日历页、导入页、设置页基础骨架；
- 实现SQLite本地数据层；
- 支持手动新增、编辑、完成和删除事项；
- 支持基础月历展示；
- 接入本地通知和系统日历写入；
- 建立基础设计令牌与UI组件；
- 添加基础测试。

### v0.2：文字解析

- 接入DeepSeek兼容API；
- 使用SecureStore保存AI API Key；
- 支持粘贴通知文字；
- 支持设置消息日期，用于解析“明天”“下周”等相对时间；
- 实现AI结构化提取；
- 使用Zod做运行时Schema校验；
- 实现候选事项确认、编辑、忽略和批量保存；
- 展示置信度、待确认字段和原文证据；
- 建立source与schedule item的可追溯关系。

### v0.3：截图解析

- 支持相册选择多张图片；
- 支持拍照导入；
- 支持图片压缩；
- 支持多图识别流程；
- 增加图片隐私提示；
- 增加原图保留策略；
- 支持删除最后一个关联事项后清理图片文件；
- 早期方案使用设备端OCR，后来在v0.5切换为EasyOCR云OCR。

### v0.4：研究生特色能力

- 支持延期、取消、改期、换地点等变更类型；
- 支持将变更消息与已有事项关联；
- 保存事项变更前后快照；
- 详情页展示变更历史；
- 编辑或删除事项后同步处理本地提醒；
- 日历、确认页和详情页支持时间冲突提示；
- 支持按事项类型和课程筛选；
- 支持组会准备事项；
- 支持JSON备份、分享和整库恢复；
- 备份不包含API Key、通知标识和图片文件。

## 3. 当前v1.0进度

v1.0在v0.5 EasyOCR能力基础上统一日期和时间输入，并整理首次公开发布所需文档。

已完成内容：

- 新增EasyOCR配置类型；
- 新增EasyOCR配置存储；
- 设置页增加EasyOCR服务地址和Access Key；
- 图片识别流程切换为EasyOCR云API；
- 导入页提示用户图片会先上传到EasyOCR，再把识别文本发送给DeepSeek；
- 移除`expo-text-extractor`本地OCR依赖；
- 文档、隐私说明、第三方声明和环境变量示例已同步到EasyOCR方案；
- 新增EasyOCR客户端测试；
- 识别流程增加EasyOCR、DeepSeek阶段提示和等待秒数；
- DeepSeek时间结果增加用户时区约束和明确本地时间纠偏；
- 识别确认页支持为新安排、改期、延期和换地点设置提醒；
- 取消事项时自动关闭原提醒；
- 编辑页和详情页支持读取、回显真实提醒状态；
- Android增加精确定时提醒权限；
- Android系统日历写入改为选择可修改日历；
- 应用内提示统一为中文自定义弹窗；
- 修复反复编辑事项导致导航栈重复堆叠；
- 导入文字输入框增加一键清空按钮；
- v0.5阶段版本号更新到`0.5.0`；
- 导入页消息发送时间支持系统日期和时间选择器；
- 识别确认页开始时间和截止时间支持系统选择器；
- 新建与编辑事项页开始时间和截止时间支持系统选择器；
- 保留`YYYY-MM-DD HH:mm`手动输入；
- 日期和时间分开合并，取消选择不覆盖原值；
- 补充时间选择、取消、空值和本地时区午夜边界测试；
- 版本号更新到`1.0.0`；
- README、架构说明、更新日志和第三方声明已同步。

已修复问题：

- `src/services/ocr/ocr-service.ts`原先使用`fetch(fileUri)`把本地图片转成`Blob`后再通过`FormData`上传；
- Expo Go会报`Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported`，Release版本会报“无法读取待上传图片”；
- 已改为`expo-file-system/legacy`的`uploadAsync`原生multipart上传，字段名保持EasyOCR要求的`file`；
- 请求头继续使用`X-Access-Key`，并保留EasyOCR返回Schema校验和错误映射；
- `tests/easyocr-client.test.ts`已改为mock `expo-file-system/legacy`的`uploadAsync`。
- 修复模型把明确本地时间错误标记为UTC，导致东八区显示偏移8小时的问题；
- 修复编辑事项时提醒显示为“保持当前提醒”、但没有读取真实提醒记录的问题；
- 修复Android调用仅iOS支持的默认日历接口问题；
- 修复编辑保存后重复创建详情页，导致返回手势需要执行多次的问题。

已完成验证：

- `npm run check`已通过，当前共35项测试；
- `npx expo export --platform android --max-workers 1`已通过。

下一步开发任务：

1. 用Release包重新验证提醒、系统日历和完整图片导入链路；
2. 在Android真机核对系统日期/时间选择器的中文界面和24小时制；
3. 处理Release APK/AAB构建环境问题；
4. 完成首次公开仓库的安全检查和发布说明。

## 4. 重要文件索引

- 项目说明：`PROJECT_CONTEXT.md`
- 更新日志：`CHANGELOG.md`
- 应用配置：`app.json`
- 依赖与命令：`package.json`
- 导入页：`src/app/(tabs)/import.tsx`
- 设置页：`src/app/(tabs)/settings.tsx`
- EasyOCR客户端：`src/services/ocr/ocr-service.ts`
- EasyOCR配置：`src/services/ocr/easyocr-config.ts`
- EasyOCR类型：`src/types/ocr.ts`
- DeepSeek客户端：`src/services/ai/deepseek-client.ts`
- 提取Schema：`src/schemas/extraction.ts`
- 日程Schema：`src/schemas/schedule.ts`
- SQLite迁移：`src/db/migrations.ts`
- 备份服务：`src/services/backup/backup-service.ts`
- 隐私文档：`docs/privacy.md`
- 架构文档：`docs/architecture.md`
- 发布文档：`docs/releasing.md`
- EasyOCR测试：`tests/easyocr-client.test.ts`

## 5. 当前调试方式

推荐继续使用Expo Go调试v1.0的图片导入链路。

常用命令：

```powershell
npm start
```

如果二维码、缓存或路由状态异常，使用：

```powershell
npx expo start --clear
```

在手机端需要配置：

- DeepSeek兼容API地址；
- DeepSeek API Key；
- 模型名称；
- EasyOCR API地址；
- EasyOCR Access Key。

注意：

- Expo Go可以用于调试图片选择、图片压缩、EasyOCR云OCR和DeepSeek解析；
- Expo Go不适合完整验证本地通知等需要原生能力的功能；
- Development Build目前暂时不作为首选调试路径，因为用户侧USB调试和Android构建环境不稳定。

## 6. 构建与环境问题记录

曾遇到的问题：

- Android SDK路径无法识别；
- `adb`不可用；
- 手机USB调试授权不稳定；
- Release构建时出现`Metaspace`和Kotlin编译相关失败；
- Expo Go二维码曾出现无法扫描或登录后仍异常的问题。

当前建议：

- 开发调试先走Expo Go；
- v1.0功能链路稳定后，再单独处理Release构建；
- Release构建优先排查Gradle JVM内存、lint vital和Kotlin编译栈信息；
- 不要把Release构建问题和EasyOCR导入问题混在一起排查。

## 7. 开源状态

项目已经具备开源基础：

- 使用MIT许可证；
- 已有`README.md`；
- 已有`CONTRIBUTING.md`；
- 已有`CODE_OF_CONDUCT.md`；
- 已有`SECURITY.md`；
- 已有`THIRD_PARTY_NOTICES.md`；
- 已有隐私说明与架构文档；
- API Key通过SecureStore保存，不写入仓库；
- 示例配置使用`.env.example`，不包含真实密钥。

需要注意：

- `package.json`当前仍保留`"private": true`，这可以防止误发布到npm，不影响把源码公开到GitHub；
- 公开仓库前需要再次确认没有真实截图、聊天记录、SQLite数据库、API Key或构建产物被提交；
- EasyOCR和DeepSeek都属于外部服务，README和隐私文档应持续明确数据流。

## 8. 下一步优先级

最高优先级：

- 完成Release提醒、系统日历、日期时间选择器和图片导入真机验证。

后续优先级：

1. 处理Release APK/AAB稳定构建；
2. 准备首次公开仓库前的安全检查清单；
3. 增加更完整的备份文件选择器和提醒规则。
