import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

import { BaseLoader } from './base';
import { StyleLoader } from './style';
import { ScriptLoader } from './script';
import { PostLoader } from './post';
import { TemplateLoader } from './template';

import * as path from 'path';

import { toPinyin } from 'src/utils/string';
import { normalize } from 'src/utils/template';
import { site, pageConfig } from 'src/config/site';
import { transArr, concat, cut } from 'src/utils/array';
import { tagsPath, archivePath } from 'src/config/project';

import { Template as IndexTemplate } from 'src/template/views/index';
import { Template as TagsTemplate } from 'src/template/views/archive/tag-list';
import { Template as PostTimeTemplate } from 'src/template/views/archive/post-time';
import { Template as PostListTemplate } from 'src/template/views/archive/post-list';

type OmitSiteProps<P extends object> = Omit<P, 'styleFile' | 'scriptFile'>;
type MergeProps<P extends object> = (posts: PostLoader[]) => OmitSiteProps<P>[];
type ReactComponent<P extends object = any> = (props: P) => JSX.Element;
type GetProps<P extends ReactComponent> = Parameters<P>[0];

export class PageLoader<P extends ReactComponent> extends BaseLoader {
    /** 类型 */
    type = 'page';
    /** 组合 props */
    mergeProps: MergeProps<P>;
    /** 页面模板文件 */
    templateFile: string;
    /** 页面模板 */
    template: ReactComponent<P> = () => '' as any;

    /** 其余相关数据 */
    attr = {
        style: '',
        script: '',
        posts: [] as PostLoader[],
    };

    /** 生成聚合页 */
    static Create() {
        [
            createIndex(),
            createTagsList(),
            // createTagPosts(),
            createArchivePosts(),
        ].forEach((page) => {
            page['_transform']();
            page.watch();
        });
    }

    constructor(template: string, mergeProps: MergeProps<GetProps<P>>) {
        super();
        this.templateFile = template;
        this.mergeProps = mergeProps;
    }

    async init() {
        const [style, script, template] = await Promise.all([
            StyleLoader.Create(),
            ScriptLoader.Create(),
            TemplateLoader.Create<(props: P) => JSX.Element>(this.templateFile),
        ]);

        style.addObserver(this.id, ({ output }) => output[0].path);
        script.addObserver(this.id, ({ output }) => output[0].path);
        template.addObserver(this.id, ({ template }) => template);
        
        const allSources = Object.values(BaseLoader.Sources);
        const posts = allSources
            .filter((item): item is PostLoader => item?.type === 'post')
            .filter((item) => item.public)
            .sort((pre, next) => pre.date < next.date ? 1 : -1);

        this.template = template.template;

        this.attr = {
            style: style.output[0]?.path || '',
            script: script.output[0]?.path || '',
            posts,
        };
    }

    async transform() {
        await this.init();

        const props = transArr(this.mergeProps(this.attr.posts)) as any[];

        this.output = props.map(({ location, ...prop }) => ({
            path: location,
            data: renderToString(createElement(this.template, {
                ...prop,
                location: normalize(location),
                styleFile: this.attr.style,
                scriptFile: this.attr.script,
            } as any)),
        }));
    }

    watch() {
        BaseLoader.addObserver('posts', this.id, this.mergeProps);
    }
}

// 空标签属性
const spaceTag = {
    name: '（空）',
    url: '_space',
};

// 生成 tag 页路径
const getTagPath = (tagName: string) => {
    return `${tagsPath}/${tagName === spaceTag.name ? spaceTag.url : toPinyin(tagName)}/`;
};

// 生成首页
function createIndex() {
    const watchPost = (posts: PostLoader[]) => posts.map((post) => ({
        title: post.title,
        create: post.date,
        tags: post.tags,
        url: path.dirname(post.output[0]?.path || ''),
        description: post.description,
    }));

    const mergeProps = (posts: PostLoader[]) => {
        const postsData = watchPost(posts);
        const peerPost = pageConfig.index;
        const indexLength = Math.ceil(postsData.length / peerPost);

        return Array(indexLength).fill(true).map((_, i) => ({
            title: i === 0 ? site.title : `第 ${i + 1} 页 · ${site.title}`,
            location: i === 0 ? 'index.html' : `page/${i + 1}/index.html`,
            pre: i === 0 ? null : i === 1 ? '' : `page/${i}/`,
            next: i === indexLength - 1 ? null : `page/${i + 1}/`,
            posts: postsData.slice(i * peerPost, (i + 1) * peerPost),
        }));
    };

    return new PageLoader<typeof IndexTemplate>('src/template/views/index/index.tsx', mergeProps);
}

// 生成标签聚合页
function createTagsList() {
    const watchPost = (posts: PostLoader[]) => {
        const map = {} as Record<string, number>;
        const tags = concat(posts.map(({ tags }) =>  tags), (tags) => tags.length === 0 ? [spaceTag.name] : tags);
        
        tags.forEach((name) => {
            if (map[name]) {
                map[name]++;
            }
            else {
                map[name] = 1;
            }
        });

        return Object.entries(map).map(([name, number]) => ({
            name, number,
        }));
    };
    const mergeProps = (posts: PostLoader[]) => {
        const tagSummary = watchPost(posts).map((tag) => ({
            ...tag,
            url: getTagPath(tag.name),
        }));

        return [{
            title: `标签 | ${site.title}`,
            location: `${tagsPath}/index.html`,
            tags: tagSummary.sort((pre, next) => {
                return pre.number > next.number ? -1 : 1;
            }),
        }];
    };

    return new PageLoader<typeof TagsTemplate>('src/template/views/archive/tag-list/index.tsx', mergeProps);
}

// 生成标签文章列表页
// function createTagPosts() {
//     const watchPost = (posts: PostLoader[]) => posts.map((post) => ({
//         tags: post.tags,
//         title: post.title,
//         output: post.output[0]?.path || '',
//     }));

//     const mergeProps = (posts: PostLoader[]) => {
//         const map = {} as Record<string, Array<{ title: string; output: string }>>;
//         const postTags = watchPost(posts).map((data) => ({
//             ...data,
//             tags: data.tags.length === 0 ? [spaceTag.name] : data.tags,
//         }));
        
//         postTags.forEach(({ tags, output, title }) => {
//             tags.forEach((tag) => {
//                 if (map[tag]) {
//                     map[tag].push({ title, output });
//                 }
//                 else {
//                     map[tag] = [{ title, output }];
//                 }
//             });
//         });

//         return Object.entries(map).map(([title, posts]) => ({
//             title,
//             location: `${getTagPath(title)}index.html`,
//             posts: posts.map(({ title, output: url }) => ({
//                 title, url,
//             })),
//         }));
//     };

//     return new PageLoader<typeof PostListTemplate>('src/template/views/archive/post-list/index.tsx', mergeProps);
// }

// 生成归档文章列表页
function createArchivePosts() {
    interface PostSimpleData {
        title: string;
        url: string;
        date: number;
    }

    const mergeProps = (posts: PostLoader[]) => {
        const simplePosts: PostSimpleData[] = posts
            .map((post: PostLoader) => ({
                date: post.date,
                title: post.title,
                url: post.output[0]?.path || '',
            }))
            .sort((pre, next) => {
                return pre.date > next.date ? 1 : -1;
            });

        const postsInPage = cut(simplePosts, pageConfig.archive);
        const getUrlByPage = (page: number) => {
            if (page < 1 || page > postsInPage.length) {
                return null;
            }

            if (page === 1) {
                return `${archivePath}/`;
            }
            else {
                return `${archivePath}/page/${page}/`;
            }
        };

        return postsInPage.map((posts, i) => ({
            current: i,
            total: postsInPage.length,
            title: `归档 · ${site.title}`,
            location: `${getUrlByPage(i + 1)}index.html`,
            getUrlByPage,
            posts,
        }));
    };

    return new PageLoader<typeof PostTimeTemplate>('src/template/views/archive/post-time/index.tsx', mergeProps);
}
