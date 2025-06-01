import { readdir } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import chalk from 'chalk';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APPS_DIR = join(__dirname, 'apps');

let successCount = 0;
let failureCount = 0;
const startTime = Date.now();
const apps = {};

logger.info(`\t${chalk.cyan('不羡仙后门正在载入...')}`);

try {

  const files = await readdir(APPS_DIR)
    .then(files => files.filter(file => file.endsWith('.js')));


  const filePaths = files.map(file => ({
    name: basename(file, '.js'),
    filePath: pathToFileURL(join(APPS_DIR, file)).href
  }));

  const loadModules = filePaths.map(async ({ name, filePath }) => {
    try {
      const moduleExports = await import(filePath);
      const defaultExport = 
        moduleExports?.default || 
        moduleExports[Object.keys(moduleExports)[0]];
      
      apps[name] = defaultExport;
      successCount++;
      
    } catch (error) {

      logger.error(`不羡仙后门载入错误：${chalk.red(name)}`);
      logger.error(error);
      failureCount++;
    }
  });

  await Promise.allSettled(loadModules);

} catch (error) {
  logger.error(`读取文件时出错：${chalk.red(error.message)}`);
}

const endTime = Date.now();
const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);

logger.info(chalk.cyan('-------------------'));
logger.info(chalk.green('不羡仙后门载入完成'));
logger.info(`成功加载：${chalk.green(successCount)} 个`);
logger.info(`加载失败：${chalk.red(failureCount)} 个`);
logger.info(`总耗时：${chalk.yellow(elapsedTime)} 秒`);
logger.info(chalk.cyan('-------------------'));

export { apps };