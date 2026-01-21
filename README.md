# Knowledge Card Sync

Sync notes to a knowledge card system for generating knowledge points and practice questions.

将笔记同步到知识卡片系统，自动生成知识点和练习题。

## Features

- **File Sync**: Sync opened Markdown files to the knowledge card system
- **Auto Generation**: Automatically generate knowledge points and practice questions
- **Knowledge Point Viewer**: Dedicated view for browsing knowledge points and questions
- **File-Card Mapping**: Track file-to-card relationships with duplicate detection
- **Token Authentication**: Secure API token-based authentication

## Installation

### From Community Plugins (Recommended)

1. Open Obsidian Settings → Community Plugins
2. Click "Browse" and search for "Knowledge Card Sync"
3. Click "Install" and then "Enable"

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder `knowledge-card-sync` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Enable the plugin in Obsidian Settings → Community Plugins

## Usage

### Configuration

1. Open Settings → Knowledge Card Sync
2. API URL: Default is `https://www.xiaoxiaodu.cn` (no change needed)
3. Get your API Token from: **https://www.xiaoxiaodu.cn/obsidian-plugin**
4. Enter your API Token and click "Verify" to test the connection

### Syncing Files

**Method 1: Batch Sync**
1. Click the cloud upload icon ☁️ in the ribbon
2. Select files to sync in the modal
3. Click "Generate Knowledge Cards"

**Method 2: Sync Current File**
1. Open a Markdown file
2. Use Command Palette (Ctrl/Cmd + P) → "Sync current file to knowledge card"

### Viewing Knowledge Points

1. Click the book icon 📖 in the ribbon
2. Or use Command Palette → "Open knowledge point viewer"
3. Browse cards and their knowledge points

## Settings

| Setting | Description |
|---------|-------------|
| API URL | Backend API base URL |
| API Token | Authentication token |
| Auto Sync | Auto-sync on file save (planned) |
| Default Tags | Tags to add when creating cards |
| Generate Knowledge Points | Auto-generate knowledge points |
| Generate Questions | Auto-generate practice questions |
| Debug Mode | Show detailed API logs in console |

## Commands

| Command | Description |
|---------|-------------|
| Sync opened files to knowledge card | Open file selector for batch sync |
| Sync current file to knowledge card | Sync the active file |
| Validate API Token | Test token validity |
| Open knowledge point viewer | Open the knowledge point browser |

## Troubleshooting

### Token Validation Failed
- Check if the API URL is correct
- Verify the token is valid and not expired
- Ensure the backend service is running

### Sync Failed
- Enable debug mode to see detailed logs
- Check browser console for error messages
- Verify network connectivity to the backend

## Backend API Requirements

The plugin requires a backend server with the following endpoints:

- `GET /api/users/me` - Token validation
- `POST /api/v1/cards` - Create cards
- `POST /api/v1/cards/{id}/generate-content` - Generate knowledge points
- `GET /api/v1/cards` - List cards
- `DELETE /api/v1/cards/{id}` - Delete cards
- `GET /api/v1/knowledge-points` - Get knowledge points

## License

[0BSD License](LICENSE)

## Links

- [Knowledge Card System](https://github.com/wakakabaihua/knowledge_point_cards)
- [Obsidian Plugin Development](https://docs.obsidian.md/)

---

# 知识卡片同步 (中文说明)

## 功能特性

- ✅ **文件选择器**：选择已打开的Markdown文件批量同步
- ✅ **单文件同步**：快速同步当前活动文件
- ✅ **自动生成**：自动创建知识卡片、提取知识点、生成练习题
- ✅ **知识点查看器**：专用界面查看和浏览知识点及题目
- ✅ **文件卡片映射**：记录文件与卡片的对应关系，支持重复检测
- ✅ **Token认证**：安全的API Token认证机制
- ✅ **进度显示**：实时显示同步进度和结果
- ✅ **标签管理**：支持为卡片添加默认标签
- 🚧 **自动同步**：保存文件时自动同步（计划中）

## 核心功能

### 📤 文件同步

将 Obsidian 笔记同步到知识卡片系统，自动生成知识点和练习题。

### 📚 知识点查看器（新功能！）

专用的知识点浏览界面，提供：
- **卡片切换**：快速切换已同步的卡片
- **知识点展示**：完整显示知识点内容，支持 Markdown 渲染
- **题目查看**：可折叠的题目列表，包含选项、答案和解析
- **实时刷新**：随时刷新最新的知识点数据

[→ 查看知识点查看器使用指南](docs/knowledge-point-view-quick-guide.md)

### 🔄 智能映射

自动记录文件与卡片的映射关系：
- 避免重复创建卡片
- 支持删除旧卡片并重新生成
- 映射数据保存在本地，随vault同步

## 安装方法

### 方法一：手动安装（开发测试）

1. 将此插件文件夹复制到您的Obsidian vault的 `.obsidian/plugins/` 目录下
2. 进入插件目录：
   ```bash
   cd /path/to/vault/.obsidian/plugins/knowledge-card-sync
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 构建插件：
   ```bash
   npm run build
   ```
5. 在Obsidian中启用插件：设置 → 社区插件 → 已安装插件 → 启用 "Knowledge Card Sync"

### 方法二：开发模式

开发时可以使用watch模式，自动重新编译：

```bash
npm run dev
```

每次修改代码后，在Obsidian中重新加载插件即可（Ctrl/Cmd + R）。

## 使用说明

### 1. 配置插件

首次使用需要配置API连接：

1. 打开 设置 → Knowledge Card Sync
2. 填写：
   - **API地址**：知识卡片后端地址（默认：`http://localhost:5000`）
   - **API Token**：从知识卡片系统获取的认证Token
3. 点击"验证"按钮测试连接

### 2. 同步文件

#### 方式一：批量同步已打开的文件

1. 点击左侧栏的云上传图标 ☁️
2. 或使用命令面板（Ctrl/Cmd + P）搜索"同步已打开的文件到知识卡片"
3. 在弹出的对话框中选择要同步的文件
4. 如果文件已经同步过，会提示是否删除旧卡片重新生成
5. 点击"生成知识卡片"按钮

#### 方式二：同步当前文件

1. 打开一个Markdown文件
2. 使用命令面板（Ctrl/Cmd + P）搜索"同步当前文件到知识卡片"
3. 如果文件已同步过，会询问是否重新生成
4. 等待生成完成

### 3. 查看知识点

#### 打开知识点查看器

1. 点击左侧栏的书本图标 📖
2. 或使用命令面板（Ctrl/Cmd + P）搜索"打开知识点查看器"

#### 浏览知识点

1. 使用"上一张"/"下一张"按钮切换卡片
2. 滚动查看当前卡片的所有知识点
3. 点击题目标题展开/收起详细内容
4. 点击"刷新"按钮重新加载数据

[→ 查看详细的知识点查看器文档](docs/knowledge-point-view.md)

### 4. 查看结果

- 同步过程中会显示进度条
- 完成后会显示成功/失败的统计
- 可以在知识卡片系统中查看生成的内容

## 配置选项

### API配置

- **API地址**：知识卡片后端API的基础URL
- **API Token**：用于认证的Token

### 同步配置

- **自动同步**：保存文件时自动同步（暂未实现）
- **默认标签**：创建卡片时自动添加的标签

### 生成配置

- **生成知识点**：创建卡片后自动生成知识点
- **生成练习题**：创建知识点后自动生成练习题

### 调试选项

- **调试模式**：在控制台输出详细的API调用日志

## 开发指南

### 项目结构

```
obsidian-knowledge-card-plugin/
├── src/
│   ├── main.ts              # 插件主入口
│   ├── types.ts             # TypeScript类型定义
│   ├── api.ts               # API客户端
│   ├── FileSelectorModal.ts # 文件选择器模态框
│   └── SettingTab.ts        # 设置选项卡
├── manifest.json            # 插件清单
├── package.json             # NPM包配置
├── tsconfig.json            # TypeScript配置
├── esbuild.config.mjs       # 构建配置
└── styles.css               # 样式文件
```

### 主要类和接口

#### KnowledgeCardPlugin (main.ts)
- 插件主类，处理生命周期和命令注册
- 管理设置和API客户端

#### KnowledgeCardAPI (api.ts)
- 封装所有后端API调用
- 方法包括：
  - `validateToken()`: 验证Token
  - `createCard()`: 创建卡片
  - `generateKnowledgePoints()`: 生成知识点
  - `createCardWithKnowledge()`: 完整流程

#### FileSelectorModal (FileSelectorModal.ts)
- 文件选择器UI
- 支持多选、进度显示、状态反馈

#### KnowledgeCardSettingTab (SettingTab.ts)
- 设置界面
- 包含所有配置选项和快捷操作

### 构建命令

```bash
# 开发模式（自动重新编译）
npm run dev

# 生产构建
npm run build

# 版本更新
npm version patch/minor/major
```

### API调用示例

```typescript
// 创建卡片
const card = await this.api.createCard(
  content,      // Markdown内容
  title,        // 卡片标题
  ['tag1', 'tag2'] // 标签
);

// 生成知识点
const result = await this.api.generateKnowledgePoints(card.id);

// 完整流程
const result = await this.api.createCardWithKnowledge(
  content,
  title,
  tags
);
```

## 后端API要求

插件需要后端提供以下API端点：

### 认证
- `GET /api/users/me` - 验证Token

### 卡片管理
- `POST /api/v1/cards` - 创建卡片
  ```json
  {
    "content_md": "markdown内容",
    "title": "卡片标题",
    "tags": ["tag1", "tag2"],
    "difficulty": 3
  }
  ```

- `POST /api/v1/cards/{card_id}/generate-content` - 生成知识点和练习题
  - 无需请求体，card_id在URL中

- `GET /api/v1/cards?page=1&limit=20` - 获取卡片列表（分页）
  - 返回格式: `{ items: [...], total: number, page: number, limit: number }`

- `GET /api/v1/cards?search=xxx&tags=xxx` - 搜索卡片
  - 支持参数: `search`（关键词）, `tags`（标签，逗号分隔）

### 认证方式
所有请求需要在Header中包含：
```
Authorization: Bearer <token>
```

## 故障排查

### 插件未加载
- 确保 `main.js` 和 `manifest.json` 在插件目录下
- 运行 `npm run build` 重新构建
- 重启Obsidian

### Token验证失败
- 检查API地址是否正确
- 确认Token是否有效
- 查看浏览器控制台的网络请求

### 文件同步失败
- 启用调试模式查看详细日志
- 检查文件内容格式
- 确认后端服务是否正常运行
- [查看完整调试指南](docs/debugging-guide.md)

## 调试和问题排查

插件提供了详细的日志系统，帮助您快速定位问题：

### 启用调试模式
1. 打开插件设置
2. 在"调试选项"中开启"调试模式"
3. 打开浏览器控制台（`Ctrl+Shift+I` 或 `Cmd+Option+I`）
4. 查看详细的 API 请求日志

### 日志说明
- `[KC Plugin]` - 插件核心日志
- `[KC API]` - API 网络请求日志
- `[KC Modal]` - 批量操作日志

每个网络请求都会显示：
- 请求 URL 和方法
- 请求/响应时间
- 状态码和响应内容
- 错误诊断信息

**📖 详细调试指南**: [debugging-guide.md](docs/debugging-guide.md)

### 常见问题快速诊断

**503 错误 - 服务不可用**
```bash
# 检查后端服务
ps aux | grep "python.*app.py"
# 检查端口
netstat -tlnp | grep python
# 测试连接
curl http://localhost:8008/
```

**Token 验证失败**
- 检查 Token 是否包含多余空格
- 确认 Token 未过期
- 在设置中点击"验证"按钮测试

**没有看到请求**
- 确认调试模式已开启
- 查看控制台是否有加载日志
- 检查 API 基础 URL 配置

## 路线图

### v1.0 (当前)
- ✅ 基础插件框架
- ✅ Token认证
- ✅ 文件选择器
- ✅ 批量同步
- ✅ 单文件同步

### v1.1 (计划中)
- 🚧 自动同步功能
- 🚧 同步历史记录
- 🚧 冲突处理

### v1.2 (规划中)
- 📋 双向同步（从知识卡片导入到Obsidian）
- 📋 增量更新
- 📋 标签同步

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 链接

- [知识卡片系统仓库](https://github.com/wakakabaihua/knowledge_point_cards)
- [Obsidian插件开发文档](https://docs.obsidian.md/)
- [Obsidian API文档](https://github.com/obsidianmd/obsidian-api)
