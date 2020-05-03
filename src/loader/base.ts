import chalk from 'chalk';

import * as path from 'path';
import * as fs from 'fs-extra';
import * as fms from 'src/utils/memory-fs';

import { buildOutput, devPort } from 'src/config/project';

import { isEqual } from 'src/utils/object';
import { removeVal, concat } from 'src/utils/array';
import { fixHtml } from 'src/utils/string';
import { isString, isFunc } from 'src/utils/assert';

import { PostLoader } from './post';

/** 全局编号 */
let id = 1;
/** 全局编译进程 */
let transformCount = 0;
/** 文件系统 */
const fileSystem = process.env.NODE_ENV === 'production' ? fs : fms;

/** 资源数据 */
type SourceData = Buffer | string;
/** 资源文件 */
interface SourceFile {
    path: string;
    data: SourceData;
}
/** 错误信息 */
interface LoaderError {
    message: string;
    filename?: string;
    location?: {
        column: number;
        line: number;
    };
}
/** 监听器 */
interface Observer {
    source: number
    lastVal: any;
    compute(data: BaseLoader): any;
}
/** 硬盘监听器 */
interface Watcher {
    close(): any;
}

/** 基础资源 */
export class BaseLoader {
    /** 资源 */
    static Sources: Record<number, BaseLoader | undefined> = {};
    /** 监听器 */
    static Observers: Record<number | string, Observer[] | undefined> = {};
    /** 添加全局监听 */
    static addObserver(name: string, source: number, compute: (date: any) => any) {
        if (!BaseLoader.Observers[name]) {
            BaseLoader.Observers[name] = [];
        }

        BaseLoader.Observers[name]?.push({
            source,
            compute,
            lastVal: undefined,
        });
    }
    /** 搜索资源 */
    static FindSource(from: string, type: string) {
        return Object.values(BaseLoader.Sources).find((source) => {
            return source?.from === from && source?.type === type;
        });
    }

    /** 构造函数 */
    constructor() {
        BaseLoader.Sources[this.id] = this;
    }

    /** 资源编号 */
    id = id++;
    /** 资源类型 */
    type = '';
    /** 错误信息 */
    errors: LoaderError[] = [];

    /** 文件在硬盘的路径 */
    from = '';
    /** 资源原始数据 */
    origin: SourceData = '';
    /** 编译后的资源 */
    output: SourceFile[] = [];
    /** 硬盘监听器 */
    diskWatcher: Watcher[] = [];
    
    /** 默认监听事件 */
    watch() {}
    /** 默认转换函数 */
    transform() {}

    /** 当前转换过程中收集的依赖 */
    private _deps: Observer[] = [];

    /** 转换开始 */
    protected transformStart() {
        this.errors = [];
        transformCount++;

        if (transformCount === 1) {
            console.log('\x1Bc');
            console.log(chalk.yellow(' Compile...\n'));
        }
    }
    /** 转换结束 */
    protected transformEnd() {
        transformCount--;

        if (transformCount < 0) {
            transformCount = 0;
        }

        this.updateDeps();
        this.notify();
        
        if (transformCount === 0) {
            const errs = concat(Object.values(BaseLoader.Sources), (item) => item?.errors);

            if (errs.length === 0) {
                let content = `${chalk.green.inverse(' DONE ')} ${chalk.green('Compiled successfully.')}\n`;

                if (process.env.NODE_ENV !== 'production') {
                    content += `\n${chalk.blue.inverse(' Info ')} ${chalk.green(`Your application is already set at http://localhost:${devPort}/.\n`)}`;
                }

                console.log('\x1Bc');
                console.log(content);
            }
            else {
                let content = `${chalk.red.inverse(' ERROR ')} ${chalk.red(`There are ${errs.length} Error.`)}\n\n`;

                errs.forEach((err) => {
                    content += chalk.red(err.message) + '\n';

                    if (err.filename) {
                        content += chalk.red(`in ${err.filename}`) + '\n';
                    }

                    content += '\n';
                });

                console.log('\x1Bc');
                console.log(content);
            }
        }
    }
    /** 依赖更新 */
    protected updateDeps() {
        // 都为空则退出
        if (!BaseLoader.Observers[this.id] && this._deps.length === 0) {
            return;
        }

        // 更新监听器
        BaseLoader.Observers[this.id] = this._deps.slice();
    }
    /** 内部真实的转换器 */
    protected async _transform() {
        this.transformStart();

        try {
            await this.transform();
            await this.write();
        }
        catch (err) {
            this.errors.push({
                message: err.message,
            });
        }

        this.transformEnd();
    }

    /** 添加监听 */
    addObserver<T extends BaseLoader>(this: T, source: number, compute: (source: T) => any) {
        this._deps.push({
            source,
            compute,
            lastVal: undefined,
        });
    }
    /** 移除监听 */
    removeObserver() {
        delete BaseLoader.Observers[this.id];

        Object.values(BaseLoader.Observers).forEach((obs) => {
            removeVal(obs || [], ({ source }) => source === this.id, true);
        });
    }
    /** 触发监听 */
    notify() {
        const allSources = Object.values(BaseLoader.Sources);
        const check = (observers: Observer[], data: any) => {
            // 迭代监听器
            for (const ob of observers) {
                const updateSource = BaseLoader.Sources[ob.source];

                if (!updateSource) {
                    continue;
                }

                const val = ob.compute(data);

                // 相等则跳过
                if (
                    (isFunc(ob.lastVal) && ob.lastVal === val) ||
                    isEqual(val, ob.lastVal)
                ) {
                    continue;
                }

                ob.lastVal = val;
                updateSource._transform();
            }
        };

        // 检查当前资源的监听
        check(BaseLoader.Observers[this.id] || [], this);

        // 文章类型有特殊事件
        if (this.type === 'post') {
            const observers = BaseLoader.Observers.posts || [];
            const posts = allSources
                .filter((item): item is PostLoader => item?.type === 'post')
                .filter((item) => item.public)
                .sort((pre, next) => pre.date < next.date ? 1 : -1);

            check(observers, posts);

            return;
        }
    }

    /** 读取资源 */
    read() {
        if (!this.from) {
            throw new Error('Input file is empty.');
        }

        return fs.readFile(this.from).then((data) => this.origin = data);
    }
    /** 编译后数据写入硬盘 */
    write() {
        return Promise.all(this.output.map(async (source) => {
            const output = path.join(buildOutput, source.path);
            const data = path.extname(source.path) === '.html' ? fixHtml(source.data) : source.data;

            await fileSystem.mkdirp(path.dirname(output));
            await fileSystem.writeFile(output, data);
        }));
    }
    /** 销毁资源 */
    destroy() {
        this.removeObserver();
        this.diskWatcher.forEach((watcher) => watcher.close());

        delete BaseLoader.Sources[this.id];
    }
}
