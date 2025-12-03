# Smart Assessment RAG 智能助手 - Node.js 版本

基于 RAG (检索增强生成) + Agent + LangChain.js 的 Smart Assessment 文档查询系统，使用千问大模型和本地 Qdrant 向量数据库。

## 🚀 技术栈

- **运行时**: Node.js 18+
- **AI 框架**: LangChain.js
- **LLM**: 千问 (qwen-turbo)
- **向量数据库**: Qdrant (本地 Docker)
- **Embedding**: 千问 text-embedding-v3 (1024维)
- **文档处理**: marked, node-html-parser
- **CLI**: chalk, ora, prompts, commander

## ✨ 核心特性

- ✅ **本地向量数据库**: 使用 Docker 部署的 Qdrant
- ✅ **LangChain.js 集成**: 使用 LangChain.js 框架
- ✅ **千问大模型**: 通过 OpenAI SDK 兼容接口对接
- ✅ **智能文档检索**: 基于语义相似度的精准检索
- ✅ **RAG Chain**: 支持 LangChain 的检索链
- ✅ **友好CLI**: 彩色输出、进度条、交互式提示

## 📋 快速开始

### 1. 环境要求

- Node.js 18.0.0+
- Docker 和 Docker Compose
- 千问 API Key

### 2. 安装步骤

#### 步骤 1: 安装依赖

```bash
npm install
```

#### 步骤 2: 启动 Qdrant

```bash
docker-compose up -d
```

验证 Qdrant 是否启动成功：
```bash
docker ps
```

访问管理界面：http://localhost:6333/dashboard

#### 步骤 3: 配置环境变量

`.env` 文件已配置好（向量维度已修正为 1024）：

```env
QWEN_API_KEY=sk-243ada9b3d674ffe8b7161127955e3f1
QWEN_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-turbo

EMBEDDING_MODEL=text-embedding-v3
EMBEDDING_DIMENSION=1024  # 千问实际维度

QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=smart_assessment_docs
```

#### 步骤 4: 初始化数据库

```bash
npm run init
```

这将：
1. 加载 `docs/` 目录下的所有 Markdown 文档
2. 将文档分割为适当大小的块
3. 为每个块生成向量 Embedding
4. 存储到 Qdrant 向量数据库

#### 步骤 5: 开始使用

```bash
npm start
```

## 📖 使用指南

### 交互式查询

```bash
$ npm start

Smart Assessment 智能助手

? 您的问题: 如何创建一个新的 Assessment?

回答：
要创建一个新的 Assessment，请按照以下步骤操作：
1. 在 "Assessments" 列表页面，点击右上角的蓝色按钮 "Add Assessment"
2. 在弹出窗口中，填写所有必填字段...

参考来源：
  1. assessments/creating-an-assessment.md (相关度: 0.89)
```

### 特殊命令

在交互模式下：
- `stats` - 查看数据库统计信息
- `clear` - 清除对话历史
- `exit` 或 `quit` - 退出程序

### 单次查询模式

```bash
npm run query -- "如何导出 Excel 报告?"
# 或
node src/index.js --query "如何导出 Excel 报告?"
```

## 🏗️ 项目结构

```
demo4/
├── src/
│   ├── config.js           # 配置管理
│   ├── documentLoader.js   # 文档加载和分割
│   ├── vectorStore.js      # Qdrant 向量存储
│   ├── agent.js            # RAG Agent 系统
│   └── index.js            # 主程序入口
├── docs/                   # 文档目录
├── qdrant_storage/         # Qdrant 数据存储
├── package.json            # 项目配置
├── docker-compose.yml      # Docker 配置
├── .env                    # 环境变量
└── README_NODEJS.md        # 本文档
```

## 🔧 NPM Scripts

```bash
npm start              # 启动交互式查询
npm run init           # 初始化数据库
npm run query          # 单次查询（需要参数）
npm run dev            # 开发模式（使用 nodemon）
```

## 💡 核心模块说明

### 1. config.js - 配置管理

使用 dotenv 加载环境变量，提供配置验证功能。

```javascript
import { config } from './config.js';

config.validate(); // 验证配置
console.log(config.QWEN_MODEL); // 访问配置
```

### 2. documentLoader.js - 文档加载

**DocumentLoader**: 加载 Markdown 文档
- 递归扫描文档目录
- 将 Markdown 转换为纯文本（使用 marked）
- 提取文档元数据

**TextSplitter**: 智能文本分割
- 使用 LangChain 的 RecursiveCharacterTextSplitter
- 按段落和句子智能分割
- 保持语义完整性

### 3. vectorStore.js - 向量存储

**EmbeddingGenerator**: Embedding 生成
- 使用 LangChain 的 OpenAIEmbeddings
- 支持单个和批量生成
- 自动配置千问 API

**QdrantVectorStoreManager**: Qdrant 管理
- 集合管理（创建、删除、重置）
- 文档向量化和存储
- 语义搜索和过滤
- 支持 LangChain VectorStore 接口

### 4. agent.js - RAG Agent

**SmartAssessmentAgent**: 智能问答引擎
- 基于 RAG 架构
- 支持两种查询方式：
  - 简单检索 + LLM 生成
  - LangChain RetrievalChain
- 上下文感知的多轮对话
- 自动来源追溯

### 5. index.js - 命令行界面

使用 commander, chalk, ora, prompts 提供友好的 CLI：
- 彩色输出（chalk）
- 加载动画（ora）
- 进度条（cli-progress）
- 交互式提示（prompts）

## 🔍 LangChain.js 集成

### 使用 LangChain Chain

```javascript
const agent = new SmartAssessmentAgent();

// 使用 LangChain 的 RetrievalChain
const result = await agent.queryWithChain("如何创建 Assessment?");
```

### 自定义 Retriever

```javascript
const vectorStore = await agent.vectorStore.getLangChainVectorStore();
const retriever = vectorStore.asRetriever({
  k: 5,
  searchType: 'similarity'
});

const docs = await retriever.getRelevantDocuments("query");
```

## ⚙️ 高级配置

### 修改 Chunk 大小

编辑 `.env`:
```env
CHUNK_SIZE=800          # 增大块大小
CHUNK_OVERLAP=100       # 增大重叠
```

### 调整检索参数

编辑 `.env`:
```env
TOP_K_RESULTS=10        # 检索更多文档
TEMPERATURE=0.3         # 降低随机性
```

### 使用不同的模型

编辑 `.env`:
```env
QWEN_MODEL=qwen-max     # 使用更强大的模型
```

## 🐛 常见问题

### Q1: 安装依赖失败？

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### Q2: Qdrant 连接失败？

确保 Qdrant 正在运行：
```bash
docker-compose up -d
docker ps
curl http://localhost:6333/collections
```

### Q3: 向量维度错误？

确保 `.env` 中配置为：
```env
EMBEDDING_DIMENSION=1024  # 千问 text-embedding-v3 是 1024 维
```

### Q4: ES Module 错误？

确保 `package.json` 中有：
```json
{
  "type": "module"
}
```

### Q5: 如何更新文档？

```bash
# 重新初始化数据库
npm run init
```

## 📊 性能优化

### 1. 批量处理

文档添加时已使用批量处理（batch size = 10）

### 2. 缓存

可以添加 LRU 缓存：

```javascript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache({ max: 100 });

async function cachedQuery(question) {
  if (cache.has(question)) {
    return cache.get(question);
  }
  const result = await agent.query(question);
  cache.set(question, result);
  return result;
}
```

### 3. 并发控制

使用 p-limit 控制并发：

```javascript
import pLimit from 'p-limit';

const limit = pLimit(5);
const promises = docs.map(doc =>
  limit(() => vectorStore.addDocuments([doc]))
);
await Promise.all(promises);
```

## 🚀 部署

### 开发环境

```bash
npm run dev  # 使用 nodemon 自动重启
```

### 生产环境

```bash
# 使用 PM2
npm install -g pm2
pm2 start src/index.js --name smart-assessment-rag

# 查看日志
pm2 logs smart-assessment-rag

# 停止
pm2 stop smart-assessment-rag
```

## 📚 相关资源

- [LangChain.js 文档](https://js.langchain.com/)
- [Qdrant 文档](https://qdrant.tech/documentation/)
- [千问 API 文档](https://help.aliyun.com/zh/dashscope/)
- [Node.js 文档](https://nodejs.org/docs/)