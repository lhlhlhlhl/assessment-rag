import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class I18nManager {
  constructor() {
    this.initialized = false;
    this.currentLanguage = 'en'; // 默认语言为英文
  }

  /**
   * 初始化i18next
   * @param {string} language - 初始语言，默认为'en'
   */
  async init(language = 'en') {
    if (this.initialized) {
      return;
    }

    await i18next
      .use(Backend)
      .init({
        lng: language,
        fallbackLng: 'en',
        debug: false,
        
        backend: {
          loadPath: join(__dirname, 'locales', '{{lng}}', 'translation.json'),
        },
        
        interpolation: {
          escapeValue: false,
        },
        
        detection: {
          order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
          caches: ['localStorage', 'cookie'],
        },
      });

    this.currentLanguage = language;
    this.initialized = true;
  }

  /**
   * 切换语言
   * @param {string} language - 目标语言代码
   */
  async changeLanguage(language) {
    if (!this.initialized) {
      await this.init(language);
      return;
    }

    await i18next.changeLanguage(language);
    this.currentLanguage = language;
  }

  /**
   * 获取当前语言
   * @returns {string} 当前语言代码
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * 获取翻译文本
   * @param {string} key - 翻译键
   * @param {object} options - 插值选项
   * @returns {string} 翻译后的文本
   */
  t(key, options = {}) {
    if (!this.initialized) {
      return key; // 如果未初始化，返回键本身
    }
    return i18next.t(key, options);
  }

  /**
   * 获取支持的语言列表
   * @returns {Array<{code: string, name: string}>} 支持的语言列表
   */
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'zh-CN', name: '中文' },
    ];
  }

  /**
   * 检查是否支持指定语言
   * @param {string} language - 语言代码
   * @returns {boolean} 是否支持
   */
  isLanguageSupported(language) {
    return this.getSupportedLanguages().some(lang => lang.code === language);
  }

  /**
   * 从环境变量或系统设置获取首选语言
   * @returns {string} 首选语言代码
   */
  getPreferredLanguage() {
    // 1. 检查环境变量
    const envLanguage = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES;
    if (envLanguage) {
      const langCode = envLanguage.split('.')[0].replace('_', '-');
      if (this.isLanguageSupported(langCode)) {
        return langCode;
      }
      
      // 尝试匹配主语言（如从 zh-CN 匹配 zh）
      const mainLang = langCode.split('-')[0];
      const matchedLang = this.getSupportedLanguages().find(
        lang => lang.code.startsWith(mainLang)
      );
      if (matchedLang) {
        return matchedLang.code;
      }
    }
    
    // 2. 默认返回英文
    return 'en';
  }
}

// 创建单例实例
const i18nManager = new I18nManager();

export default i18nManager;