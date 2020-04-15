import md5 from 'md5';
import less from 'less';
import CleanCss from 'clean-css';

import { BaseLoader } from './base';
import { isString } from 'src/utils/assert';
import { resolveRoot } from 'src/utils/path';
import { readfiles } from 'src/utils/file-system';
import { templatePath } from 'src/config/project';

/** 全局唯一 style 资源 */
let style: StyleLoader | null;
/** 全局 css 最小化处理器 */
const minify = new CleanCss();

export class StyleLoader extends BaseLoader {
    static async Create() {
        if (style) {
            return style;
        }

        style = new StyleLoader();
        
        await style._transform();

        return style;
    }

    async transform() {
        const files = await readfiles(templatePath);
        const styles = files.filter((file) => /\.less$/.test(file));
        const origin = styles.map((file) => `@import '${file}';`).join('\n');

        const lessOutput = await less.render(origin, { paths: [resolveRoot('src/template')] })
            .catch((e) => this.error = `${e.message}\n in ${e.filename}`);

        if (isString(lessOutput)) {
            this.setBuildTo();
            return;
        }

        const code = process.env.NODE_ENV === 'production'
            ? minify.minify(lessOutput.css).styles
            : lessOutput.css;

        this.source = [{
            data: code,
            path: '',
        }];

        this.setBuildTo();
    }
    
    setBuildTo() {
        const source = this.source[0];

        if (process.env.NODE_ENV === 'production') {
            source.path = `/css/style.${md5(source.data)}.css`;
        }
        else {
            source.path = '/css/style.css';
        }
    }
}
