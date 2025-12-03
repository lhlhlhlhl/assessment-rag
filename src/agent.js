/**
 * Agent 智能问答系统
 * 基于 RAG + LangChain.js
 */
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { config } from './config.js';
import { QdrantVectorStoreManager } from './vectorStore.js';
import i18nManager from './i18n/index.js';

/**
 * Smart Assessment 智能助手
 */
export class SmartAssessmentAgent {
  constructor() {
    // 初始化 LLM
    this.llm = new ChatOpenAI({
      modelName: config.QWEN_MODEL,
      temperature: config.TEMPERATURE,
      openAIApiKey: config.QWEN_API_KEY,
      configuration: {
        baseURL: config.QWEN_API_BASE
      }
    });

    this.vectorStore = new QdrantVectorStoreManager();
    this.conversationHistory = [];
  }

  /**
   * 构建系统提示词
   */
  _buildSystemPrompt() {
    return `你是 Smart Assessment 系统的智能助手，专门帮助用户了解和使用 Smart Assessment 系统。

你的职责：
1. 根据提供的文档内容准确回答用户关于 Smart Assessment 系统的问题
2. 提供清晰、结构化的回答，包括具体的操作步骤
3. 如果用户的问题不在文档范围内，诚实地告诉用户
4. 使用友好、专业的语气与用户交流

回答规范：
- 优先使用文档中的信息回答
- 如果涉及操作步骤，请分步骤列出
- 提供相关的文档来源引用
- 对于不确定的信息，明确告知用户
- 使用中文回答所有问题

注意事项：
- 不要编造不存在的功能或信息
- 如果文档中没有相关信息，建议用户查阅官方文档或联系技术支持
- 保持回答的简洁和准确性`;
  }

  /**
   * 使用简单的检索方式查询
   */
  async query(question, topK = config.TOP_K_RESULTS, useHistory = false) {
    try {
      // 1. 检索相关文档
      const searchResults = await this.vectorStore.search(question, topK);

      if (searchResults.length === 0) {
        return {
          question,
          answer: '抱歉，我在文档中没有找到相关信息。请尝试换一个问法，或查阅完整的官方文档。',
          sources: [],
          contextUsed: false
        };
      }

      // 2. 构建上下文
      const context = searchResults
        .map((result, index) => {
          const source = result.metadata.source || 'Unknown';
          const score = result.score.toFixed(2);
          return `[文档 ${index + 1}] (来源: ${source}, 相关度: ${score})\n${result.content}`;
        })
        .join('\n\n---\n\n');

      // 3. 构建消息
      const messages = [
        { role: 'system', content: this._buildSystemPrompt() },
        {
          role: 'user',
          content: `基于以下文档内容回答用户问题。

相关文档内容：
${context}

用户问题：
${question}

请根据上述文档内容回答用户的问题。如果文档中没有相关信息，请明确告知用户。`
        }
      ];

      // 4. 添加历史对话（如果需要）
      if (useHistory && this.conversationHistory.length > 0) {
        // 在系统消息后插入历史对话
        const historyMessages = this.conversationHistory.slice(-10); // 最多保留 10 轮
        messages.splice(1, 0, ...historyMessages);
      }

      // 5. 调用 LLM 生成答案
      const response = await this.llm.invoke(messages);
      const answer = response.content;

      // 6. 更新对话历史
      if (useHistory) {
        this.conversationHistory.push(
          { role: 'user', content: question },
          { role: 'assistant', content: answer }
        );

        // 限制历史长度
        if (this.conversationHistory.length > 20) {
          this.conversationHistory = this.conversationHistory.slice(-20);
        }
      }

      // 7. 返回结果
      return {
        question,
        answer,
        sources: searchResults.map(result => ({
          source: result.metadata.source || 'Unknown',
          score: result.score,
          contentPreview: result.content.substring(0, 100) + '...'
        })),
        contextUsed: true
      };
    } catch (error) {
      console.error(i18nManager.t('agent.error_processing_query', { error: error.message }));
      return {
        question,
        answer: `抱歉，生成答案时出错: ${error.message}`,
        sources: [],
        contextUsed: false,
        error: error.message
      };
    }
  }

  /**
   * 使用 LangChain 的 RAG Chain（高级版本）
   */
  async queryWithChain(question) {
    try {
      // 获取 LangChain VectorStore
      const vectorStore = await this.vectorStore.getLangChainVectorStore();
      const retriever = vectorStore.asRetriever({ k: config.TOP_K_RESULTS });

      // 创建提示词模板
      const qaPrompt = ChatPromptTemplate.fromMessages([
        ['system', this._buildSystemPrompt()],
        [
          'user',
          `基于以下上下文回答问题：

上下文：
{context}

问题：
{input}

请根据上述上下文回答问题。如果上下文中没有相关信息，请明确告知。`
        ]
      ]);

      // 创建文档组合链
      const combineDocsChain = await createStuffDocumentsChain({
        llm: this.llm,
        prompt: qaPrompt
      });

      // 创建检索链
      const retrievalChain = await createRetrievalChain({
        retriever,
        combineDocsChain
      });

      // 执行查询
      const result = await retrievalChain.invoke({
        input: question
      });

      return {
        question,
        answer: result.answer,
        sources: result.context.map((doc, index) => ({
          source: doc.metadata.source || 'Unknown',
          score: 1.0, // LangChain chain 不返回 score
          contentPreview: doc.pageContent.substring(0, 100) + '...'
        })),
        contextUsed: true
      };
    } catch (error) {
      console.error(i18nManager.t('agent.error_processing_query', { error: error.message }));
      throw error;
    }
  }

  /**
   * 清除对话历史
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * 获取集合统计信息
   */
  async getCollectionStats() {
    return await this.vectorStore.getCollectionInfo();
  }
}
