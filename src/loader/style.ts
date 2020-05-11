import md5 from 'md5';
import Stylus from 'stylus';
import cssTree from 'css-tree';
import CleanCss from 'clean-css';

import { watch } from 'chokidar';
import { readFile } from 'fs-extra';
import { join, basename } from 'path';

import { BaseLoader } from './base';
import { resolveRoot } from 'src/utils/path';
import { resolvePublic } from 'src/utils/template';
import { readfiles } from 'src/utils/file-system';
import { templatePath } from 'src/config/project';

/** 全局唯一 style 资源 */
let style: StyleLoader | null;
/** 全局 css 最小化处理器 */
const minify = new CleanCss();

export class StyleLoader extends BaseLoader {
    /** 类型 */
    type = 'style';
    /** katex 样式文本 */
    katexCss = '';

    static async Create() {
        if (style) {
            return style;
        }

        style = new StyleLoader();

        style.watch();
        style.output = [{ data: '', path: '' }];
        
        await style._transform();

        return style;
    }

    async useKatex() {
        const origin = await readFile(resolveRoot('node_modules/katex/dist/katex.css'));
        const ast = cssTree.parse(origin.toString());

        cssTree.walk(ast, function(node) {
            if (node.type === 'Raw' && node.value.toLowerCase().indexOf('fonts') >= 0) {
                node.value = resolvePublic('/font/katex', basename(node.value));
            }
        });

        this.katexCss = cssTree.generate(ast);
    }

    async transform() {
        if (!this.katexCss) {
            await this.useKatex();
        }

        const files = await readfiles(templatePath);
        const styles = files.filter((file) => /\.styl$/.test(file));
        const origin = styles.map((file) => `@import '${file}';`).join('\n');

        const stylusOutput = await (new Promise<string>((resolve) => {
            const config = {
                paths: [resolveRoot('src/template')],
            };

            Stylus.render(origin, config, (err, css) => {
                if (err) {
                    this.errors = [err];
                }
                
                resolve(css || '');
            });
        }));

        const data = process.env.NODE_ENV === 'production'
            ? minify.minify(stylusOutput).styles
            : stylusOutput;
        const path = process.env.NODE_ENV === 'production'
            ? `/css/style.${md5(data)}.css`
            : '/css/style.css';

        this.output = [{ data: `${data}\n${this.katexCss}`, path }];
    }

    watch() {
        // 开发模式监听
        if (process.env.NODE_ENV === 'development') {
            const watcher = watch(join(templatePath, '**/*.styl'), {
                ignored: /(^|[\/\\])\../,
                persistent: true,
            });

            const update = () => this._transform();

            watcher
                .on('add', update)
                .on('unlink', update)
                .on('change', update);
            
            this.diskWatcher = [watcher];
        }
    }
}
