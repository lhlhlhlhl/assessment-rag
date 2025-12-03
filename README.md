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

我来为您详细解释demo4项目中每个文件的作用以及整个系统的工作流程。这个项目是一个基于RAG（检索增强生成）技术的智能问答系统，让我从整体架构开始，然后深入到每个文件的具体功能和调用关系。

## 项目整体架构

demo4项目是一个本地化的RAG系统，主要功能是将文档内容转换为向量存储在Qdrant向量数据库中，然后基于这些存储的文档内容回答用户的问题。整个流程可以概括为：文档加载 → 文本分割 → 向量化 → 存储 → 检索 → 生成回答。

## 文件结构与功能详解

### 1. config.js - 配置管理

这个文件负责管理整个系统的配置参数，包括：
- 千问API的配置（API密钥、基础URL、模型名称）
- Qdrant向量数据库的配置（主机、端口、集合名称）
- 文档处理的配置（文档路径、文本块大小、重叠大小）
- 向量化配置（模型、维度）
- Agent配置（最大上下文长度、检索结果数量、温度参数）

配置文件还提供了验证方法，确保必要的配置项（如API密钥和文档路径）已正确设置。

### 2. i18n/index.js - 国际化管理

这个文件实现了多语言支持功能，主要包含：
- I18nManager类：负责初始化i18next库，加载语言资源
- 语言切换功能：支持英语(en)和中文(zh-CN)两种语言
- 翻译文本获取：提供t()方法获取当前语言的翻译文本

国际化文件确保系统能够根据用户偏好显示不同语言的提示信息，提高用户体验。

### 3. documentLoader.js - 文档处理

这个文件实现了文档加载和文本分割的核心功能，包含三个主要类：

#### Document类
- 表示一个文档对象，包含内容和元数据
- 提供了创建文档对象的基本结构

#### DocumentLoader类
- 负责从文件系统加载Markdown文档
- 实现了递归扫描目录功能，可以查找所有.md文件
- 将Markdown内容转换为纯文本
- 创建Document对象并返回文档列表

#### TextSplitter类
- 基于LangChain的RecursiveCharacterTextSplitter实现文本分割
- 支持中文标点符号作为分隔符
- 可配置文本块大小和重叠大小
- 将长文档分割为适合向量化的文本块

### 4. vectorStore.js - 向量存储与检索

这个文件实现了向量生成、存储和检索功能，包含两个主要类：

#### EmbeddingGenerator类
- 使用OpenAI的Embeddings模型生成文本向量
- 配置了千问API的密钥和基础URL
- 提供了generateEmbeddings方法将文本转换为向量

#### QdrantVectorStoreManager类
- 负责与Qdrant向量数据库交互
- 初始化Qdrant客户端
- 管理向量集合（创建、检查存在性、删除）
- 实现文档添加功能：将文档文本转换为向量并存储
- 实现相似性搜索功能：根据查询向量检索最相似的文档

### 5. agent.js - 智能问答代理

这个文件实现了RAG系统的核心问答逻辑：

#### SmartAssessmentAgent类
- 集成了大语言模型（通过ChatOpenAI调用千问API）
- 使用QdrantVectorStoreManager检索相关文档
- 提供两种查询方法：
  1. query方法：简单的检索和回答
  2. queryWithChain方法：使用LangChain的RAG Chain进行更复杂的处理
- 管理对话历史和上下文
- 构建系统提示词，指导模型如何基于检索到的文档回答问题
- 处理错误和异常情况

### 6. index.js - 主程序入口

这个文件是整个系统的入口点，实现了命令行交互界面：

#### initDatabase函数
- 初始化整个数据库的流程：
  1. 验证配置是否正确
  2. 加载所有Markdown文档
  3. 将文档分割为文本块
  4. 初始化Qdrant向量存储
  5. 生成向量并批量存储到数据库
  6. 显示进度条和状态信息

#### interactiveQuery函数
- 实现交互式问答界面：
  1. 初始化智能代理
  2. 接收用户输入
  3. 处理特殊命令（退出、清除历史、查看统计）
  4. 调用代理处理查询
  5. 显示回答和来源相关性分数

#### 主程序流程
1. 解析命令行参数
2. 根据参数执行初始化数据库或交互式查询
3. 处理国际化设置

## 系统工作流程详解

### 初始化流程（文档存入向量数据库）

1. **配置验证**：index.js调用config.js的validateConfig方法，确保必要的配置项已设置

2. **文档加载**：
   - 创建DocumentLoader实例
   - 调用loadDocuments方法，递归扫描指定目录下的所有.md文件
   - 将每个Markdown文件转换为Document对象

3. **文本分割**：
   - 创建TextSplitter实例，配置块大小和重叠大小
   - 调用splitDocuments方法，将每个文档分割为较小的文本块
   - 每个文本块保留原始文档的元数据

4. **向量存储初始化**：
   - 创建EmbeddingGenerator实例，配置API密钥和模型
   - 创建QdrantVectorStoreManager实例，配置数据库连接参数
   - 检查或创建向量集合

5. **向量化与存储**：
   - 对每个文本块调用EmbeddingGenerator的generateEmbeddings方法生成向量
   - 调用QdrantVectorStoreManager的addDocuments方法，将文本块和对应向量存储到数据库
   - 显示进度条，实时反馈处理状态

### 查询流程（基于存储的文档回答问题）

1. **代理初始化**：
   - 创建SmartAssessmentAgent实例
   - 初始化ChatOpenAI（千问模型）和QdrantVectorStoreManager
   - 设置对话历史

2. **接收用户输入**：
   - 通过命令行界面接收用户问题
   - 检查是否为特殊命令（退出、清除历史等）

3. **文档检索**：
   - 使用EmbeddingGenerator将用户问题转换为向量
   - 调用QdrantVectorStoreManager的similaritySearch方法检索相关文档
   - 获取最相关的文档片段及其相关性分数

4. **生成回答**：
   - 将检索到的文档片段作为上下文
   - 构建包含上下文和问题的提示词
   - 调用千问API生成回答
   - 返回回答和来源文档信息

## 函数调用关系图

```
index.js (主入口)
├── initDatabase()
│   ├── config.validateConfig()
│   ├── documentLoader.loadDocuments()
│   │   └── DocumentLoader.loadMarkdownFiles()
│   ├── textSplitter.splitDocuments()
│   ├── vectorStoreManager.initializeCollection()
│   ├── embeddingGenerator.generateEmbeddings()
│   └── vectorStoreManager.addDocuments()
└── interactiveQuery()
    ├── agent.init()
    │   ├── new ChatOpenAI()
    │   └── new QdrantVectorStoreManager()
    └── agent.query() / agent.queryWithChain()
        ├── embeddingGenerator.generateEmbeddings()
        ├── vectorStoreManager.similaritySearch()
        └── llm.invoke()
```

## 为什么需要这么多函数？

将系统拆分为多个文件和函数有以下好处：

1. **模块化设计**：每个文件负责特定功能，降低代码复杂度
2. **可维护性**：修改某个功能不会影响其他部分
3. **可重用性**：各个模块可以在不同场景下重复使用
4. **测试友好**：可以单独测试每个模块的功能
5. **职责分离**：配置、国际化、文档处理、向量存储、问答逻辑各自独立

这种架构设计使得整个系统更加灵活、可扩展，并且易于理解和维护。每个函数都有明确的职责，通过组合这些函数实现完整的RAG系统功能。

希望这个详细的解释能帮助您理解demo4项目的结构和每个文件的作用！如果您对某个特定部分有更多疑问，我很乐意进一步解释。