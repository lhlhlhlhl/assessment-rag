/**
 * 配置管理模块
 * 从环境变量加载配置
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import i18nManager from './i18n/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

class Config {
  constructor() {
    // 千问 API 配置
    this.QWEN_API_KEY = process.env.QWEN_API_KEY || '';
    this.QWEN_API_BASE = process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-turbo';

    // Qdrant 配置
    this.QDRANT_HOST = process.env.QDRANT_HOST || 'localhost';
    this.QDRANT_PORT = parseInt(process.env.QDRANT_PORT || '6333', 10);
    this.QDRANT_COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || 'smart_assessment_docs';

    // Embedding 配置
    this.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-v3';
    this.EMBEDDING_DIMENSION = parseInt(process.env.EMBEDDING_DIMENSION || '1024', 10);

    // 文档处理配置
    this.CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '500', 10);
    this.CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '50', 10);
    this.DOCS_PATH = path.join(__dirname, '..', process.env.DOCS_PATH || 'docs');

    // Agent 配置
    this.MAX_CONTEXT_LENGTH = parseInt(process.env.MAX_CONTEXT_LENGTH || '4000', 10);
    this.TOP_K_RESULTS = parseInt(process.env.TOP_K_RESULTS || '5', 10);
    this.TEMPERATURE = parseFloat(process.env.TEMPERATURE || '0.7');
  }

  /**
   * 验证配置
   */
  validate() {
    if (!this.QWEN_API_KEY) {
      throw new Error(i18nManager.t('config.missing_env_vars', { vars: 'QWEN_API_KEY' }));
    }

    if (!fs.existsSync(this.DOCS_PATH)) {
      throw new Error(i18nManager.t('config.docs_path_not_exist', { path: this.DOCS_PATH }));
    }

    return true;
  }
}

// 导出配置实例
export const config = new Config();
