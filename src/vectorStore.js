/**
 * 向量存储和检索模块
 * 使用 Qdrant 和 LangChain.js
 */
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import i18nManager from './i18n/index.js';

/**
 * Embedding 生成器
 */
export class EmbeddingGenerator {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: config.EMBEDDING_MODEL,
      openAIApiKey: config.QWEN_API_KEY,
      configuration: {
        baseURL: config.QWEN_API_BASE
      }
    });
  }

  /**
   * 为单个文本生成 embedding
   */
  async generateEmbedding(text) {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      console.error('生成 embedding 时出错:', error);
      throw error;
    }
  }

  /**
   * 批量生成 embeddings
   */
  async generateEmbeddings(texts) {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error) {
      console.error('批量生成 embeddings 时出错:', error);
      throw error;
    }
  }
}

/**
 * Qdrant 向量存储
 */
export class QdrantVectorStoreManager {
  constructor() {
    this.client = new QdrantClient({
      url: `http://${config.QDRANT_HOST}:${config.QDRANT_PORT}`
    });
    this.collectionName = config.QDRANT_COLLECTION_NAME;
    this.embeddingGenerator = new EmbeddingGenerator();
  }

  /**
   * 初始化集合
   */
  async initCollection() {
    try {
      // 检查集合是否存在
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        col => col.name === this.collectionName
      );

      if (!exists) {
        // 创建新集合
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: config.EMBEDDING_DIMENSION,
            distance: 'Cosine'
          }
        });
        console.log(i18nManager.t('vector_store.creating_collection', { name: this.collectionName }));
      } else {
        console.log(i18nManager.t('vector_store.collection_exists', { name: this.collectionName }));
      }
    } catch (error) {
      console.error('初始化集合时出错:', error);
      throw error;
    }
  }

  /**
   * 添加文档到向量存储
   */
  async addDocuments(documents) {
    try {
      const points = [];

      for (const doc of documents) {
        // 生成 embedding
        const embedding = await this.embeddingGenerator.generateEmbedding(
          doc.pageContent
        );

        // 创建点
        const point = {
          id: uuidv4(),
          vector: embedding,
          payload: {
            content: doc.pageContent,
            ...doc.metadata
          }
        };

        points.push(point);
      }

      // 批量插入
      await this.client.upsert(this.collectionName, {
        wait: true,
        points
      });

      console.log(`成功添加 ${documents.length} 个文档块到向量存储`);
    } catch (error) {
      console.error('添加文档时出错:', error);
      throw error;
    }
  }

  /**
   * 搜索相似文档
   */
  async search(query, topK = config.TOP_K_RESULTS, filter = null) {
    try {
      // 生成查询的 embedding
      const queryEmbedding = await this.embeddingGenerator.generateEmbedding(query);

      // 搜索
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: topK,
        filter: filter,
        with_payload: true
      });

      // 格式化结果
      const results = searchResult.map(result => ({
        content: result.payload.content,
        score: result.score,
        metadata: {
          ...result.payload,
          content: undefined
        }
      }));

      return results;
    } catch (error) {
      console.error('搜索时出错:', error);
      throw error;
    }
  }

  /**
   * 使用 LangChain 的 QdrantVectorStore
   */
  async getLangChainVectorStore() {
    try {
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        this.embeddingGenerator.embeddings,
        {
          url: `http://${config.QDRANT_HOST}:${config.QDRANT_PORT}`,
          collectionName: this.collectionName
        }
      );

      return vectorStore;
    } catch (error) {
      console.error('获取 LangChain VectorStore 时出错:', error);
      throw error;
    }
  }

  /**
   * 获取集合信息
   */
  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        collectionName: this.collectionName,
        pointsCount: info.points_count,
        vectorsCount: info.vectors_count,
        status: info.status
      };
    } catch (error) {
      console.error('获取集合信息时出错:', error);
      throw error;
    }
  }

  /**
   * 删除集合
   */
  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName);
      console.log(`删除集合: ${this.collectionName}`);
    } catch (error) {
      console.error('删除集合时出错:', error);
      throw error;
    }
  }

  /**
   * 重置集合
   */
  async resetCollection() {
    try {
      await this.deleteCollection();
      await this.initCollection();
      console.log(`重置集合: ${this.collectionName}`);
    } catch (error) {
      console.error('重置集合时出错:', error);
      throw error;
    }
  }
}
