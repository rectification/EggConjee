import React from 'react';

import { site } from 'src/config/site';
import { tagsPath, archivePath } from 'src/config/project';
import { resolvePublic, normalize, stringifyClass } from 'src/utils/template';

interface Props {
    /** 当前页面网址 */
    location: string;
}

export function Header({ location }: Props) {
    const indexHref = normalize('/');
    const aboutHref = normalize('/posts/about/');
    const tagHref = resolvePublic(tagsPath, '/');
    const archiveHref = resolvePublic(archivePath, '/');
    const navs = [
        {
            name: '首页',
            href: indexHref,
            highlight: /^\/(index\.html)?$/.test(location),
        },
        {
            name: '归档',
            href: archiveHref,
            highlight: location.indexOf(archiveHref) === 0,
        },
        // {
        //     name: '标签',
        //     href: tagHref,
        //     highlight: href.indexOf(tagHref) === 0,
        // },
        {
            name: '关于',
            href: aboutHref,
            highlight: /^\/posts\/about\/(index\.html)?$/.test(location),
        },
    ];

    return <header className='main-header-wrapper'>
        <span className='main-header'>
            <a className='main-title'>
                {site.title}
            </a>
            <nav className='main-nav'>
                {navs.map((nav, i) => (
                    <a
                        key={i}
                        href={nav.href}
                        className={stringifyClass('main-nav__item', {
                            'main-nav__item-highlight': nav.highlight,
                        })}>
                        {nav.name}
                        {nav.highlight ? <span className='main-nav__item-bar' /> : ''}
                    </a>
                ))}
            </nav>
        </span>
    </header>;
}
