import * as path from 'path';
import * as fs from 'fs-extra';

import { watch } from 'chokidar';

import { BaseLoader } from './base';

import { toMap } from 'src/utils/array';
import { assetsPath } from 'src/config/project';
import { readfiles } from 'src/utils/file-system';

/** 全局唯一 copy 资源 */
let copy: CopyLoader | null;
/** 复制文件状态 */
interface FromData {
    from: string;
    dirName?: string;
}

export class CopyLoader extends BaseLoader {
    /** 类型 */
    type = 'copy';
    /** 基础路径 */
    dirs: FromData[] = [];

    /** 创建图片元素 */
    static async Create(from: FromData[]) {
        if (copy) {
            return copy;
        }

        copy = new CopyLoader();

        copy.dirs = from;
        copy.watch();

        await copy._transform();

        return copy;
    }

    async transform() {
        // 旧数据
        const dataMap = toMap(this.output, ({ path }) => path, ({ data }) => data);
        // 数据列表清空
        this.output = [];

        await Promise.all(this.dirs.map(async ({ from, dirName }) => {
            const files = await readfiles(from);

            for (let i = 0; i < files.length; i++) {
                const input = files[i];
                const relative = path.relative(from, input);
                const output = dirName ? path.join(dirName, relative) : relative;
                const oldData = dataMap[output];

                if (this.output.some(({ path }) => path === output)) {
                    continue;
                }

                if (oldData) {
                    this.output.push({
                        path: output,
                        data: oldData,
                    });
                }
                else {
                    this.output.push({
                        path: output,
                        data: await fs.readFile(input),
                    });
                }
            }
        }));
    }

    watch() {
        if (process.env.NODE_ENV === 'development') {
            const paths = this.dirs.map(({ from }) => from);
            const watcher = watch(paths, {
                ignored: /(^|[\/\\])\../,
                persistent: true
            });

            const update = () => this._transform();

            watcher
                .on('add', update)
                .on('unlink', update)
                .on('change', (file) => {
                    const changeFile = path.relative(assetsPath, file);
                    this.output = this.output.filter((data) => data.path !== changeFile);
                    update();
                });
            
            this.diskWatcher = [watcher];
        }
    }
}
