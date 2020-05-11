import * as path from 'path';

import { publicPath } from 'src/config/project';
import { isString, isObject } from './assert';

export const normalize = (href: string) => {
    let str = href.replace(/[\\\/]+/g, '/');

    // 链接开始没有加上公共路径
    if (str[0] !== '/') {
        str = publicPath + str;
    }

    // 以文件结尾的链接
    if (/\.[a-z0-9]+$/.test(str)) {
        return str;
    }

    // 超链接末尾没有 / 时就加上
    if (str[str.length - 1] !== '/') {
        str += '/';
    }

    return str;
};

/** 网页模板路径相加 */
export const resolvePublic = (...paths: string[]) => {
    return normalize(path.join(publicPath, ...paths));
};

export type ClassObject = Record<string, boolean>;
export type ClassInput = string | undefined | ClassObject;

/** 解析对象 class */
export function stringifyClass(...opt: ClassInput[]) {
    /** 解析 class 对象 */
    function parseClassObject(classObject: ClassObject) {
        return Object.keys(classObject).filter((key) => classObject[key]);
    }

    const className: string[] = [];

    for (let i = 0; i < opt.length; i++) {
        const item = opt[i];

        if (isObject(item)) {
            className.push(...parseClassObject(item));
        }
        else if (isString(item)) {
            className.push(item.trim());
        }
    }

    return className.join(' ');
}
