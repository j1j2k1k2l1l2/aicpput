# CppUT（VS Code 扩展）调试说明

## 在 VS Code 中启动调试

如果你按下 `F5` 后没有出现 **Extension Development Host**，通常不是你操作错误，而是调试前置条件不满足。正确流程如下：

1. 打开的是**扩展项目根目录**（应能看到 `package.json`，且其中包含 `"engines": { "vscode": ... }`、`activationEvents` 等扩展字段）。
2. 进入 **Run and Debug**，在调试配置中选择 **Run Extension**（而不是 Node.js/Chrome 等其他配置）。
3. 按 `F5` 启动，VS Code 才会拉起新的 **Extension Development Host** 窗口。
4. 在新窗口左侧 Activity Bar 中查看 CppUT 入口。

## 常见原因排查

- 当前打开的不是扩展仓库根目录（例如只打开了上层目录或子目录）。
- 仓库里缺少 `.vscode/launch.json` 的 `Run Extension` 配置。
- 首次运行前未安装依赖（如 `npm install` / `pnpm install`）。
- VS Code 键位被改动，`F5` 没有绑定到 `Start Debugging`。
- Activity Bar 被隐藏：执行命令 `View: Appearance: Show Activity Bar` 重新显示。

## 建议替换的原文

原文“按 F5（Run Extension）”容易让人误解为任何项目都可直接拉起扩展宿主。建议改成：

> 在扩展项目根目录打开仓库，进入 Run and Debug 并选择 **Run Extension**，再按 `F5`。成功后会弹出 **Extension Development Host**。

