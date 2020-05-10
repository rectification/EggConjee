import pinyin from 'pinyin';

import { concat } from './array';
import { isString } from './assert';

export function toPinyin(str: string) {
    const strs = concat(pinyin(str, { style: pinyin.STYLE_NORMAL }), (arr) => arr);

    return strs
        .join('-')
        .replace(/([a-zA-Z0-9]+)/g, '-$1-')
        .replace(/[ -]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

export function fixHtml<T extends string | Buffer>(content: T): T {
    const prefix = '<!DOCTYPE html>';
    const isStr = isString(content);
    const data = isStr ? content : content.toString();
    const fixed = data.indexOf(prefix) === 0 ? data : prefix + data;

    return (isStr ? fixed : Buffer.from(fixed)) as T;
}
