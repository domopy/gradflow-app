# 第三方声明

研程使用的第三方软件由各自作者按其许可证授权。完整依赖版本记录在`package-lock.json`中，安装后的权威许可证文本位于各包的`node_modules`目录。

主要直接依赖包括：

- Expo及Expo Router：MIT
- React及React Native：MIT
- Expo SQLite、Notifications、Calendar、SecureStore、FileSystem：MIT
- Expo ImagePicker、ImageManipulator：MIT
- React Native Community DateTimePicker：MIT
- Zod：MIT
- Vitest：MIT
- ESLint及eslint-config-expo：MIT

项目最初使用Expo官方`create-expo-app`模板生成，并在MIT许可下进行了重构。模板示例代码和品牌资源已从应用实现中移除。

图片识别可调用用户自行配置的EasyOCR云服务。EasyOCR属于外部服务，不随本仓库分发，其使用条款、额度和数据处理规则由服务提供方负责。

发布二进制或重新分发第三方包时，发布者有责任保留适用的版权与许可证声明。
