import { BaseLoader } from './base';
import { resolveRoot } from 'src/utils/path';
import { watch, WatchEventType } from 'src/utils/rollup';

/** 加载器类型 */
const typeName = 'template';

export class TemplateLoader<T> extends BaseLoader {
    /** 类型 */
    type = typeName;
    /** 模板本体 */
    template: T = (() => '') as any;

    static async Create<T>(entry: string) {
        const fullPath = resolveRoot(entry);
        const exist = BaseLoader.FindSource(fullPath, typeName);

        if (exist) {
            return exist as TemplateLoader<T>;
        }

        const template = new TemplateLoader<T>();

        template.from = fullPath;
        template.watch();

        // 非开发模式直接引用
        if (process.env.NODE_ENV !== 'development') {
            template.template = require(template.from).Template;
        }

        return template;
    }

    watch() {
        if (process.env.NODE_ENV === 'development') {
            const rollupOpt = {
                input: this.from,
                external: ['react'],
                output: {
                    format: 'commonjs' as const,
                },
            };
    
            const watcher = watch(rollupOpt, (result) => {
                if (result.type === WatchEventType.Start) {
                    this.transformStart();
                }
                else if (result.type === WatchEventType.Error) {
                    this.errors = [{
                        message: result.error.message,
                        filename: result.error.loc?.file,
                        location: {
                            column: result.error.loc?.column || -1,
                            line: result.error.loc?.line || -1,
                        },
                    }];

                    this.transformEnd();
                }
                else {
                    const Modules = (() => {
                        const exports = {};
                        eval(result.code);
                        return exports
                    })() as any;

                    this.template = Modules.Template;
                    this.transformEnd();
                }
            });

            this.diskWatcher = [watcher];
        }
    }
}
