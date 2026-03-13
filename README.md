# CppUT Assistant VSCode 插件（前端 TS/JS + 后端 Python）

本仓库实现了一个 **VSCode 插件**：针对当前打开的 C++ 工程，选择目标函数后生成 GoogleTest 单元测试，并尝试运行覆盖率流程。

> 本次重构已将后端核心模块从 TS/JS 迁移到 Python：
> - 模型训练与调用模块（当前为模型调用）
> - 知识图谱模块（占位）
> - C++ 代码解析模块
> - Memory 模块（占位）
>
> UI 交互模块与宿主启动逻辑继续保留在 TS/JS。

---

## 1. 功能概览

### 1.1 UI 交互模块（TS/JS，保留）
- VSCode 左侧边栏显示 `CppUT Assistant`。
- 支持刷新工程索引、选择文件、勾选方法、流式显示生成内容、保存测试文件、触发覆盖率命令。

### 1.2 模型训练与调用模块（Python）
- 当前不做训练，仅做调用。
- 通过环境变量读取：
  - `CPPUT_API_ENDPOINT`
  - `CPPUT_API_KEY`
- 未配置时自动回退为 mock 流式输出，方便离线联调。

### 1.3 知识图谱模块（Python，占位）
- 将所选方法信息转为上下文文本，拼接到 prompt 中。

### 1.4 C++ 代码解析模块（Python）
- 扫描工程目录树的 C/C++ 文件。
- 提取方法签名并建立 `文件 -> 方法列表` 索引。

### 1.5 Memory 模块（Python，占位）
- 保存一次生成会话中的流式文本块，最终合并输出。

---

## 2. 总体架构

- `src/`：VSCode 扩展前端与宿主逻辑（TypeScript）。
- `python_backend/`：后端业务模块（Python）。
- TS 通过 `child_process.spawn` 调用 Python 后端命令：
  - `python -m python_backend.service index --root <workspace>`
  - `python -m python_backend.service generate --file <file> --methods <json_array>`

---

## 3. Prompt 设计（已内置）

后端生成时使用你要求的提示词结构：

- “你是c++测试专家，你的任务是根据提供的目标测试源函数信息，使用googletest作为基础测试框架编写测试用例。”
- 包含目标函数名与签名。
- 明确要求行覆盖率、分支覆盖率。
- 输出完整、可编译的 `.cpp` 测试文件。
- 不保留 `main` 函数。

---

## 4. Windows 环境安装（详细步骤）

## 4.1 必备软件

1. **Node.js 18+（建议 20 LTS）**
2. **Python 3.10+（建议 3.11）**
3. **Git**
4. **VSCode 1.85+**
5. （覆盖率可选）CMake / Ninja / MinGW 或 MSVC / gcovr

可用以下命令检查：

```powershell
node -v
npm -v
python --version
git --version
```

## 4.2 克隆与安装前端依赖

```powershell
git clone <你的仓库地址>
cd aicpput
npm install
```

## 4.3 创建 Python 虚拟环境（强烈建议）

```powershell
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
```

> 当前 Python 后端仅使用标准库，不强制第三方 pip 包。
>
> 若你希望生成 HTML 覆盖率报告，建议额外安装：

```powershell
pip install gcovr
```

## 4.4 模型 API 环境变量（可选）

不设置时会使用 mock 输出；设置后可调用真实模型。

### 4.4.1 当前代码里“读取环境变量”的具体位置

- Python 后端读取模型配置的代码在：`python_backend/model_client.py` 的 `ModelClientModule.stream_generate` 方法。
- 该方法通过 `os.getenv("CPPUT_API_ENDPOINT")` 与 `os.getenv("CPPUT_API_KEY")` 决定是走真实模型还是 mock 输出。

### 4.4.2 临时设置（仅当前 PowerShell 会话生效）

```powershell
$env:CPPUT_API_ENDPOINT="https://your-llm-endpoint/v1/chat/completions"
$env:CPPUT_API_KEY="your_api_key"
```

验证是否设置成功：

```powershell
echo $env:CPPUT_API_ENDPOINT
echo $env:CPPUT_API_KEY
```

### 4.4.3 永久设置（用户级环境变量）

```powershell
[System.Environment]::SetEnvironmentVariable("CPPUT_API_ENDPOINT","https://your-llm-endpoint/v1/chat/completions","User")
[System.Environment]::SetEnvironmentVariable("CPPUT_API_KEY","your_api_key","User")
```

设置后请**关闭并重新打开 VSCode**，让扩展宿主进程读取到新变量。

### 4.4.4 Python 可执行文件名不是 `python` 时

在 `src/modules/pythonBackendClient.ts` 的 `PythonBackendClient` 中，会优先读取 `CPPUT_PYTHON_BIN`（默认值为 `python`）。你可以这样设置：

```powershell
$env:CPPUT_PYTHON_BIN="py"
```

---

## 5. 如何运行插件

## 5.1 编译扩展

```powershell
npm run compile
```

## 5.2 启动调试宿主

1. 在 VSCode 中打开本仓库。
2. 按 `F5`（Run Extension）。
3. 在新弹出的 Extension Development Host 中，点击左侧 `CppUT` 图标。

## 5.3 在 C++ 工程中使用

1. 打开目标 C++ 工程目录。
2. 点击 **刷新工程方法索引**。
3. 选择目标文件并勾选方法。
4. 点击 **流式生成测试**。
5. 点击 **保存测试文件** 导出 `.cpp`。
6. 点击 **运行覆盖率流程**（按你本地工具链情况尝试执行）。

---

## 6. Python 后端模块说明

`python_backend/` 目录：

- `cpp_parser.py`：目录扫描与方法提取。
- `model_client.py`：模型调用与 mock 回退。
- `knowledge_graph.py`：上下文增强（占位）。
- `memory_store.py`：流式记忆聚合（占位）。
- `test_generator.py`：Prompt 生成。
- `service.py`：命令入口（供 TS 调用）。
- `types.py`：数据结构。

---

## 7. 命令行直接验证后端（可选）

在仓库根目录执行：

### 7.1 索引工程方法

```powershell
python -m python_backend.service index --root .
```

### 7.2 生成测试（示例）

```powershell
python -m python_backend.service generate --file "你的cpp文件路径" --methods "[\"methodA\",\"methodB\"]"
```

后端会输出 JSON 行（chunk/done），供 VSCode 前端流式读取。

---

## 8. 覆盖率说明

插件中“运行覆盖率流程”已按终端平台区分命令：

- **Windows PowerShell**（`src/modules/coverageRunner.ts`）：
  - `if (Test-Path CMakeLists.txt) { cmake -S . -B build; ... }`
  - `if (Test-Path build) { Set-Location build }`
  - `ctest --output-on-failure`
  - 若存在 `gcovr` 则生成 `coverage.html`
- **Linux/macOS shell**：
  - 保持原有 bash 风格命令链（`if [ -f ... ]` / `&&` / `|| true`）。

这样可以避免 PowerShell 下把 bash 语法解析成 `if` / `&&` / `||` 语法错误。

> 不同项目构建参数差异很大，实际项目中建议按工程情况调整。

---

## 9. 已知限制

- C++ 方法提取基于正则，复杂模板/宏/多行声明可能不完整。
- 真实模型接口兼容性取决于你的 API 返回格式。
- 知识图谱与 Memory 当前为占位实现，便于后续扩展。

---

## 11. 问题修复记录：方法列表可检索，但生成仅出现 mock 提示

### 11.1 现象

- 在宿主插件中点击“刷新工程方法索引”可以正常返回方法列表。
- 点击“流式生成测试”后，仅返回 `// Mock Stream Output` 等 mock 文本。
- 用户误以为后端未进入 `service.py::cmd_generate` / `model_client.py::stream_generate`。

### 11.2 实际原因

根因并不是“生成命令完全未触发”，而是**模型配置没有被稳定传递到 Python 子进程**，导致 Python 后端判定 `CPPUT_API_ENDPOINT` / `CPPUT_API_KEY` 缺失，自动回退到 mock 输出。

常见触发场景：

1. 在 VSCode `settings.json` 中填写了 API 配置，但没有设置为系统环境变量；旧实现只读取 `process.env`，不会主动读取插件设置并转发给 Python。
2. 只设置了 Key 或只设置了 Endpoint，旧实现会静默走 mock，外观上像“调用了生成但没走真实模型”。

### 11.3 修复方案（已落地）

1. **TS 侧新增配置透传**
   - 新增插件设置项：
     - `cpput.apiEndpoint`
     - `cpput.apiKey`
   - 在 `PythonBackendClient.getPythonEnv()` 中，优先用环境变量，其次读取 VSCode 配置，并统一注入 `CPPUT_API_ENDPOINT` / `CPPUT_API_KEY` 给 Python 子进程。

2. **Python 侧增强配置读取与错误提示**
   - `model_client.py` 支持多组环境变量别名（`CPPUT_*`、`OPENAI_*`、`API_*`）。
   - 当 Key 与 Endpoint 都缺失时仍允许 mock（离线联调）。
   - 当只缺其中一个时不再静默 mock，而是抛出明确错误，便于快速定位配置问题。

### 11.4 使用建议

- 推荐优先在 VSCode 设置中配置：`cpput.apiEndpoint` 与 `cpput.apiKey`。
- 若使用环境变量，请确保 Extension Host 进程可见（修改后重启 VSCode）。
- 调试时若看到“模型配置不完整”报错，先检查 Key 与 Endpoint 是否成对出现。

---

## 10. 二次开发建议

- 用 clangd/libclang 替换正则解析，提高方法识别准确率。
- 在 UI 中增加“按类/命名空间”过滤。
- 增加覆盖率结果可视化（树形+高亮）。
- 将 Memory 与 KG 接入向量数据库实现检索增强。


## 12. 问题修复记录：点击“流式生成测试”无响应

### 12.1 现象

- 在宿主插件里可正常点击按钮，但输出框无流式内容。
- 已在 VSCode 设置中配置 `cpput.apiEndpoint=https://api.deepseek.com` 与 `cpput.apiKey`，仍看起来“没有触发生成”。

### 12.2 根因

`python_backend/model_client.py` 旧实现会把 `cpput.apiEndpoint` 直接当成完整请求地址。
当你填的是基础地址（如 `https://api.deepseek.com`）时，后端实际请求 URL 缺少 `/chat/completions`，导致模型调用失败，前端看起来像“点击无反应”。

### 12.3 代码修复

已在 Python 模型客户端落地以下修复：

1. 自动规范化 endpoint：
   - 若配置为基础地址，自动补全为 `${endpoint}/chat/completions`。
   - 若已是完整地址（以 `/chat/completions` 结尾）则保持不变。
2. 请求体增加 `model` 字段：
   - 支持读取 `CPPUT_MODEL` / `OPENAI_MODEL`，默认 `deepseek-chat`。
3. 兼容更多响应内容格式：
   - 除了字符串 `message.content`，也支持数组结构中的 `text` 片段拼接。

### 12.4 建议配置

- 推荐把 `cpput.apiEndpoint` 直接设为 `https://api.deepseek.com`（现在会自动补全路径）。
- 或显式设为 `https://api.deepseek.com/chat/completions`。
- 修改配置后请重启 Extension Host（F5 调试场景建议重启整个调试会话）。
