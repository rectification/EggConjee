import { resolveRoot } from '../utils/path';

/** 项目输出文件路径 */
export const buildOutput = resolveRoot('dist');
/** 文章路径 */
export const postsDir = resolveRoot('posts');

/** 网站资源公共路径 */
export const publicPath = '/';

/** 全局资源文件文件夹 */
export const assetsPath = resolveRoot('src/template/assets');
/** 插件路径 */
export const pluginPath = resolveRoot('src/template/plugins');
