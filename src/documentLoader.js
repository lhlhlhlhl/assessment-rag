/**
 * 文档加载和处理模块
 */
import fs from 'fs/promises';
import path from 'path';
import { marked } from 'marked';
import { parse } from 'node-html-parser';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { config } from './config.js';
import i18nManager from './i18n/index.js';

/**
 * 文档类
 */
export class Document {
  constructor(pageContent, metadata = {}) {
    this.pageContent = pageContent;
    this.metadata = metadata;
  }
}

/**
 * 文档加载器
 */
export class DocumentLoader {
  constructor(docsPath = config.DOCS_PATH) {
    this.docsPath = docsPath;
  }

  /**
   * 加载 Markdown 文件并转换为纯文本
   */
  async loadMarkdownFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // 将 Markdown 转换为 HTML
      const html = await marked.parse(content);

      // 使用 node-html-parser 提取纯文本
      const root = parse(html);
      const text = root.textContent || '';

      return text.replace(/\n\n+/g, '\n\n').trim();
    } catch (error) {
      console.error(i18nManager.t('document_loader.load_file_error', { file: filePath }), error.message);
      throw error;
    }
  }

  /**
   * 递归查找所有 .md 文件
   */
  async findMarkdownFiles(dir) {
    const files = [];

    async function scan(currentDir) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    }

    await scan(dir);
    return files;
  }

  /**
   * 加载所有文档
   */
  async loadAllDocuments() {
    const documents = [];

    try {
      const mdFiles = await this.findMarkdownFiles(this.docsPath);

      for (const filePath of mdFiles) {
        try {
          const content = await this.loadMarkdownFile(filePath);

          // 获取相对路径
          const relativePath = path.relative(this.docsPath, filePath);
          const category = path.dirname(relativePath);

          const doc = new Document(content, {
            source: relativePath.replace(/\\/g, '/'),
            filePath: filePath,
            fileName: path.basename(filePath),
            category: category === '.' ? 'root' : category
          });

          documents.push(doc);
        } catch (error) {
          console.error(i18nManager.t('document_loader.load_file_error', { file: filePath }), error.message);
        }
      }

      return documents;
    } catch (error) {
      console.error(i18nManager.t('document_loader.load_documents_error'), error);
      throw error;
    }
  }
}

/**
 * 文本分割器
 */
export class TextSplitter {
  constructor(chunkSize = config.CHUNK_SIZE, chunkOverlap = config.CHUNK_OVERLAP) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ['\n\n', '\n', '。', '！', '？', ';', '；', ' ', '']
    });
  }

  /**
   * 分割文档
   */
  async splitDocuments(documents) {
    const splitDocs = [];

    for (const doc of documents) {
      try {
        // 使用 LangChain 的文本分割器
        const chunks = await this.splitter.splitText(doc.pageContent);

        chunks.forEach((chunk, index) => {
          const splitDoc = new Document(chunk, {
            ...doc.metadata,
            chunkId: index,
            totalChunks: chunks.length
          });
          splitDocs.push(splitDoc);
        });
      } catch (error) {
        console.error(i18nManager.t('text_splitter.split_error'), error);
      }
    }

    return splitDocs;
  }
}
