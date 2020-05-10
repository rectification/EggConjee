import Token from 'markdown-it/lib/token';

import * as fs from 'fs-extra';
import * as path from 'path';

import * as project from 'src/config/project';

import { parse } from 'yaml';
import { watch } from 'chokidar';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

import { ImageLoader } from './image';
import { StyleLoader } from './style';
import { ScriptLoader } from './script';
import { BaseLoader } from './base';
import { TemplateLoader } from './template';

import { Markdown } from 'src/renderer/markdown';
import { readfiles } from 'src/utils/file-system';

import { isArray, isUndef } from 'src/utils/assert';
import { normalize } from 'src/utils/path';
import { toPinyin } from 'src/utils/string';

import { Template as DefaultTemplate } from 'src/template/views/post/default';

/** 文章模板 */
enum PostTemplate {
    default,
}

/** 文章原始元数据 */
interface PostMeta {
    /** 文章标题 */
    title: string;
    /** 文章创建时间 */
    date: string;
    /** 文章原文 */
    content: string;
    /** 文章简介 */
    description?: string;
    /** 是否可以被列表检索 */
    public?: boolean;
    /** 指定链接标题 */
    url?: string;
    /** 文章标签 */
    tags?: string[];
    /** 文章最后更新时间 */
    update?: string;
    /** 文章模板 */
    template?: string;
    /** 文章启用的插件 */
    plugins?: string[];
    /** 禁用的插件 */
    disabled?: string[];
}

/** 文章元数据 */
export interface PostData {
    title: string;
    date: number;
    update: number;
    tags: string[];
    html: string;
    url: string;
    public: boolean;
    content: string;
    description: string;
    template: PostTemplate;
    tokens: Token[];
    plugins: string[];
}

/** 文章外部属性 */
interface AttrData {
    styleFile: string;
    scriptFile: string;
    [PostTemplate.default]: typeof DefaultTemplate;
}

/** 默认插件 */
const defaultPlugins = ['goto-top', 'toc'];
/** 加载器类型 */
const typeName = 'post';

export class PostLoader extends BaseLoader implements PostData {
    /** 类型 */
    type = typeName;
    /** 文章标题 */
    title = '';
    /** 文章创建日期 */
    date = -1;
    /** 文章更新日期 */
    update = -1;
    /** 是否可以被列表检索 */
    public = true;
    /** 指定链接标题 */
    url = '';
    /** 文章标签内容 */
    tags: string[] = [];
    /** 文章编译后的 html 源码 */
    html = '';
    /** 文章原始内容 */
    content = '';
    /** 文章简介 */
    description = '';
    /** 文章编译的模板 */
    template = PostTemplate.default;
    /** 文章编译后的 tokens 列表 */
    tokens: Token[] = [];
    /** 文章所使用的插件列表 */
    plugins: string[] = [];

    /** 其余相关数据 */
    attr: AttrData = {
        styleFile: '',
        scriptFile: '',
        [PostTemplate.default]: () => '' as any,
    };

    /** 创建文章 */
    static async Create(from: string): Promise<PostLoader> {
        const exist = BaseLoader.FindSource(from, typeName);

        if (exist) {
            return exist as PostLoader;
        }

        const post = new PostLoader();

        post.from = from;

        await post.read();
        await post._transform();

        post.watch();

        return post;
    }
    /** 读取所有文章 */
    static async LoadPosts() {
        const files = await readfiles(project.postsDir);

        // 读取所有文章
        for (let i = 0; i < files.length; i++) {
            const postPath = files[i];

            if (path.extname(postPath) !== '.md') {
                continue;
            }

            await PostLoader.Create(postPath);
        }
    }

    async init() {
        const [style, script, template] = await Promise.all([
            StyleLoader.Create(),
            ScriptLoader.Create(),
            TemplateLoader.Create<typeof DefaultTemplate>('src/template/views/post/default'),
        ]);

        style.addObserver(this.id, ({ output }) => output[0].path);
        style.addObserver(this.id, ({ output }) => output[0].path);
        template.addObserver(this.id, ({ template }) => template);

        this.attr = {
            styleFile: style.output[0].path,
            scriptFile: script.output[0].path,
            [PostTemplate.default]: template.template,
        };

        if (this.output.length === 0) {
            this.output = [{
                data: '',
                path: '',
            }];
        }
    }

    async readMeta() {
        const result = this.origin.toString().match(/^---([\d\D]+?)---([\d\D]*)$/);
        const setErr = (msg: string) => this.errors = [{
            message: msg,
            filename: this.from,
        }];

        if (!result) {
            setErr('文件格式错误');
            return;
        }

        const [, metaStr, content] = result;
        const meta = parse(metaStr) as PostMeta;

        if (!meta) {
            setErr('缺失文章属性');
            return;
        }

        if (!meta.date) {
            setErr('文章必须要有 [date] 字段');
            return;
        }

        this.tags = meta.tags || [];
        this.title = meta.title;
        this.url = meta.url || '';
        this.content = (content || '').trim();
        this.description = meta.description || this.content.slice(0, 200).replace(/[\n\r]/g, '');
        this.public = isUndef(meta.public) ? true : meta.public;
        this.date = new Date(meta.date).getTime();
        this.update = meta.update
            ? new Date(meta.update).getTime()
            : (await fs.stat(this.from)).mtimeMs;
        
        const readArr = (str?: string | string[]) => {
            if (!str) {
                return [];
            }
            else if (isArray(str)) {
                return str;
            }
            else {
                return str.split(',').map((item) => item.trim().toLowerCase());
            }
        };

        meta.plugins = readArr(meta.plugins);
        meta.disabled = readArr(meta.disabled);

        // 默认全部加载
        if (meta.plugins.length === 0 && meta.disabled.length === 0) {
            this.plugins = defaultPlugins;
        }
        // 输入插件列表，则以此为准
        else if (meta.plugins.length > 0) {
            this.plugins = meta.plugins;
        }
        // 禁用插件列表，则取反
        else if (meta.disabled.length > 0) {
            this.plugins = defaultPlugins.filter((item) => !meta.disabled!.includes(item));
        }

        this.template = PostTemplate[meta.template || PostTemplate[0]];

        if (typeof this.template !== 'number') {
            setErr(`模板名称错误：${meta.title}`);
            return;
        }
    }

    async setBuildTo() {
        const createAt = (new Date(this.date)).getFullYear();
        const decodeTitle = toPinyin(this.title).toLowerCase();

        // 指定链接
        if (this.url) {
            this.output[0].path = path.normalize(`/posts/${this.url}/index.html`);
        }
        else {
            this.output[0].path = path.normalize(`/posts/${createAt}/${decodeTitle}/index.html`);
        }
    }

    async readToken(token: Token | Token[]) {
        if (isArray(token)) {
            for (let i = 0; i < token.length; i++) {
                await this.readToken(token[i]);
            }
            return;
        }

        let item: BaseLoader | null = null;

        const dirpath = path.dirname(this.from);

        switch (token.type) {
            case 'image': {
                const imageRef = normalize(dirpath, token.attrGet('src') || '');

                if (!imageRef) {
                    break;
                }

                item = await ImageLoader.Create(imageRef);
                token.attrSet('src', item.output[0].path);

                break;
            }
        }

        if (process.env.NODE_ENV === 'development' && item) {
            item.addObserver(this.id, ({ output }) => output[0].path);
        }

        if (token.children && token.children.length > 0) {
            await this.readToken(token.children);
        }
    }

    async transform() {
        await this.init();
        await this.readMeta();
        await this.setBuildTo();

        this.tokens = Markdown.parse(this.content, {});

        await this.readToken(this.tokens);

        this.html = Markdown.renderer.render(this.tokens, {}, {});

        this.output[0].data = renderToString(createElement(this.attr[this.template], {
            location: this.output[0].path,
            ...this.attr,
            ...this,
        }));
    }

    watch() {
        if (process.env.NODE_ENV === 'server') {
            const watcher = watch(this.from);

            watcher
                .on('unlink', () => this.destroy())
                .on('change', async () => {
                    await this.read();
                    await this._transform();
                });
            
            this.diskWatcher = [watcher];
        }
    }
}
