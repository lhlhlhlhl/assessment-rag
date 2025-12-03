/**
 * 主程序 - 命令行交互界面
 */
import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import { config } from './config.js';
import { DocumentLoader, TextSplitter } from './documentLoader.js';
import { QdrantVectorStoreManager } from './vectorStore.js';
import { SmartAssessmentAgent } from './agent.js';
import i18nManager from './i18n/index.js';

const program = new Command();

// 初始化国际化
await i18nManager.init(i18nManager.getPreferredLanguage());

/**
 * 初始化数据库
 */
async function initDatabase() {
  console.log(chalk.bold.blue(`\n${i18nManager.t('initDatabase.title')}\n`));

  try {
    // 1. 验证配置
    console.log(chalk.yellow(`${i18nManager.t('initDatabase.step1')}`));
    config.validate();
    console.log(chalk.green(`${i18nManager.t('initDatabase.configValid')}\n`));

    // 2. 加载文档
    console.log(chalk.yellow(`${i18nManager.t('initDatabase.step2')}`));
    const loader = new DocumentLoader();
    const documents = await loader.loadAllDocuments();
    console.log(chalk.green(`${i18nManager.t('initDatabase.docsLoaded', { count: documents.length })}\n`));

    // 3. 分割文档
    console.log(chalk.yellow(`${i18nManager.t('initDatabase.step3')}`));
    const splitter = new TextSplitter();
    const splitDocs = await splitter.splitDocuments(documents);
    console.log(chalk.green(`${i18nManager.t('initDatabase.docsSplit', { count: splitDocs.length })}\n`));

    // 4. 初始化向量存储
    console.log(chalk.yellow(`${i18nManager.t('initDatabase.step4')}`));
    const vectorStore = new QdrantVectorStoreManager();

    try {
      await vectorStore.initCollection();
      console.log(chalk.green(`${i18nManager.t('initDatabase.qdrantConnected')}\n`));
    } catch (error) {
      console.log(chalk.red.bold(`${i18nManager.t('initDatabase.connectionFailed', { error: error.message })}`));
      console.log(chalk.yellow(`\n${i18nManager.t('initDatabase.ensureQdrant')}`));
      console.log('  docker-compose up -d\n');
      return false;
    }

    // 5. 生成向量并存储
    console.log(chalk.yellow(`${i18nManager.t('initDatabase.step5')}`));
    console.log(chalk.dim(`${i18nManager.t('initDatabase.vectorizingWait')}\n`));

    try {
      // 重置集合
      await vectorStore.resetCollection();

      // 创建进度条
      const progressBar = new cliProgress.SingleBar({
        format: `${i18nManager.t('initDatabase.progressFormat', { 
          bar: chalk.cyan('{bar}'), 
          percentage: '{percentage}', 
          value: '{value}', 
          total: '{total}' 
        })}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      });

      progressBar.start(splitDocs.length, 0);

      // 批量添加文档
      const batchSize = 10;
      for (let i = 0; i < splitDocs.length; i += batchSize) {
        const batch = splitDocs.slice(i, i + batchSize);
        await vectorStore.addDocuments(batch);
        progressBar.update(Math.min(i + batchSize, splitDocs.length));
      }

      progressBar.stop();
      console.log(chalk.green(`\n${i18nManager.t('initDatabase.docsAdded', { count: splitDocs.length })}\n`));

      // 显示统计信息
      const stats = await vectorStore.getCollectionInfo();
      console.log(chalk.bold.green(`${i18nManager.t('initDatabase.complete')}`));
      console.log(`  ${i18nManager.t('initDatabase.collectionName')}: ${stats.collectionName}`);
      console.log(`  ${i18nManager.t('initDatabase.pointsCount')}: ${stats.pointsCount}`);
      console.log(`  ${i18nManager.t('initDatabase.vectorsCount')}: ${stats.vectorsCount}`);
      console.log(`  ${i18nManager.t('initDatabase.status')}: ${stats.status}\n`);

      return true;
    } catch (error) {
      console.log(chalk.red.bold(`${i18nManager.t('initDatabase.vectorizationFailed', { error: error.message })}`));
      return false;
    }
  } catch (error) {
    console.log(chalk.red.bold(`${i18nManager.t('initDatabase.initFailed', { error: error.message })}`));
    return false;
  }
}

/**
 * 交互式问答
 */
async function interactiveQuery() {
  console.log(chalk.bold.blue(`\n${i18nManager.t('interactiveQuery.title')}\n`));
  console.log(chalk.dim(i18nManager.t('interactiveQuery.instructions')));
  console.log(chalk.dim(i18nManager.t('interactiveQuery.exitInstruction')));
  console.log(chalk.dim(i18nManager.t('interactiveQuery.clearInstruction')));
  console.log(chalk.dim(i18nManager.t('interactiveQuery.statsInstruction') + '\n'));

  // 初始化 Agent
  let agent;
  try {
    agent = new SmartAssessmentAgent();
    await agent.vectorStore.initCollection();
  } catch (error) {
    console.log(chalk.red.bold(`${i18nManager.t('interactiveQuery.agentInitFailed', { error: error.message })}`));
    console.log(chalk.yellow(`\n${i18nManager.t('interactiveQuery.ensureRequirements')}`));
    console.log(`  1. ${i18nManager.t('interactiveQuery.requirement1')}`);
    console.log(`  2. ${i18nManager.t('interactiveQuery.requirement2')}\n`);
    return;
  }

  // 交互循环
  while (true) {
    try {
      const response = await prompts({
        type: 'text',
        name: 'question',
        message: chalk.cyan(i18nManager.t('interactiveQuery.questionPrompt')),
        validate: value => value.length > 0 || i18nManager.t('interactiveQuery.questionValidation')
      });

      const question = response.question;

      if (!question) {
        break;
      }

      // 处理特殊命令
      const exitCommands = i18nManager.t('interactiveQuery.exitCommands').split(',');
      if (exitCommands.includes(question.toLowerCase())) {
        console.log(chalk.yellow(`\n${i18nManager.t('interactiveQuery.goodbye')}\n`));
        break;
      }

      if (question.toLowerCase() === i18nManager.t('interactiveQuery.clearCommand').toLowerCase()) {
        agent.clearHistory();
        console.log(chalk.green(`${i18nManager.t('interactiveQuery.historyCleared')}\n`));
        continue;
      }

      if (question.toLowerCase() === i18nManager.t('interactiveQuery.statsCommand').toLowerCase()) {
        const stats = await agent.getCollectionStats();
        console.log(chalk.blue(`\n${i18nManager.t('interactiveQuery.databaseStats')}:`));
        console.log(`  ${i18nManager.t('initDatabase.collectionName')}: ${stats.collectionName}`);
        console.log(`  ${i18nManager.t('initDatabase.pointsCount')}: ${stats.pointsCount}`);
        console.log(`  ${i18nManager.t('initDatabase.vectorsCount')}: ${stats.vectorsCount}`);
        console.log(`  ${i18nManager.t('initDatabase.status')}: ${stats.status}\n`);
        continue;
      }

      // 查询
      const spinner = ora(i18nManager.t('interactiveQuery.thinking')).start();
      const result = await agent.query(question, undefined, true);
      spinner.stop();

      // 显示答案
      console.log(chalk.bold.green(`\n${i18nManager.t('interactiveQuery.answer')}:`));
      console.log(chalk.white(result.answer));

      // 显示来源
      if (result.sources && result.sources.length > 0) {
        console.log(chalk.bold.blue(`\n${i18nManager.t('interactiveQuery.sources')}:`));
        result.sources.forEach((source, index) => {
          console.log(
            `  ${index + 1}. ${source.source} ` +
            chalk.dim(`(${i18nManager.t('interactiveQuery.relevance')}: ${source.score.toFixed(2)})`)
          );
        });
      }

      console.log(''); // 空行
    } catch (error) {
      if (error.message === 'User canceled') {
        console.log(chalk.yellow(`\n${i18nManager.t('interactiveQuery.goodbye')}\n`));
        break;
      }
      console.log(chalk.red(`\n${i18nManager.t('interactiveQuery.error', { error: error.message })}\n`));
    }
  }
}

/**
 * 单次查询
 */
async function singleQuery(question) {
  try {
    const agent = new SmartAssessmentAgent();
    await agent.vectorStore.initCollection();

    console.log(chalk.cyan(`\n${i18nManager.t('singleQuery.question')}: ${question}\n`));

    const spinner = ora(i18nManager.t('interactiveQuery.thinking')).start();
    const result = await agent.query(question);
    spinner.stop();

    console.log(chalk.bold.green(`${i18nManager.t('singleQuery.answer')}:`));
    console.log(chalk.white(result.answer));

    if (result.sources && result.sources.length > 0) {
      console.log(chalk.bold.blue(`\n${i18nManager.t('interactiveQuery.sources')}:`));
      result.sources.forEach((source, index) => {
        console.log(`  ${index + 1}. ${source.source}`);
      });
    }

    console.log('');
  } catch (error) {
    console.log(chalk.red(`${i18nManager.t('singleQuery.error', { error: error.message })}`));
  }
}

/**
 * 主函数
 */
async function main() {
  program
    .name(i18nManager.t('app.name'))
    .description(i18nManager.t('app.description'))
    .version('1.0.0');

  program
    .option('--init', i18nManager.t('app.initOption'))
    .option('-q, --query <question>', i18nManager.t('app.queryOption'))
    .option('-l, --language <language>', i18nManager.t('app.languageOption'));

  program.parse();

  const options = program.opts();

  // 处理语言切换
  if (options.language) {
    if (i18nManager.isLanguageSupported(options.language)) {
      await i18nManager.changeLanguage(options.language);
      console.log(chalk.green(`${i18nManager.t('app.languageChanged', { language: options.language })}`));
    } else {
      console.log(chalk.red(`${i18nManager.t('app.languageNotSupported', { language: options.language })}`));
      console.log(chalk.yellow(`${i18nManager.t('app.supportedLanguages')}:`));
      i18nManager.getSupportedLanguages().forEach(lang => {
        console.log(`  - ${lang.code}: ${lang.name}`);
      });
      return;
    }
  }

  // 初始化数据库
  if (options.init) {
    const success = await initDatabase();
    if (success) {
      console.log(chalk.bold.green(`${i18nManager.t('app.readyToUse')}`));
      console.log(i18nManager.t('app.startInstructions'));
      console.log('  npm start\n');
    }
    return;
  }

  // 单次查询
  if (options.query) {
    await singleQuery(options.query);
    return;
  }

  // 交互式查询
  await interactiveQuery();
}

// 运行主函数
main().catch(error => {
  console.error(chalk.red(`${i18nManager.t('app.error')}:`), error);
  process.exit(1);
});