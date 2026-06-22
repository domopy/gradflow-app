# 发布检查清单

## 发布前

- 确认工作区只包含预期改动；
- 更新`CHANGELOG.md`和应用版本；
- 运行`npm ci`验证锁文件；
- 运行`npm run verify`；
- 导出Android和Web Bundle；
- 使用EAS Preview生成可安装APK并完成真机回归；
- 使用EAS Production生成签名AAB；
- 使用虚构数据检查核心流程；
- 确认仓库中不存在密钥、真实聊天、真实截图或数据库；
- 检查权限文案、隐私说明和应用内行为一致；
- 审阅`npm audit`结果及Expo上游安全状态。

## 创建发布

1. 合并经过审查的Pull Request；
2. 创建符合语义化版本的标签；
3. 从`CHANGELOG.md`整理发布说明；
4. 附上已验证平台与已知限制；
5. 不在发布附件中包含开发数据库或环境配置。

## Android构建

```bash
npx eas init
npm run build:android:preview
npm run build:android:production
```

`preview`用于内部安装验证，`production`用于商店发布。仓库不保存签名文件；签名凭据由EAS远程管理。GitHub仓库配置`EXPO_TOKEN`后，推送`v*`标签会创建GitHub Release并启动Production AAB构建。

## 发布后

- 验证标签和发布说明；
- 检查CI状态；
- 关注安装、迁移、权限和数据丢失反馈；
- 对安全问题使用私密披露流程。
