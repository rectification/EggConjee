import React from 'react';

import { PropsWithChildren } from 'react';

import { Header } from '../header';
import { Footer } from '../footer';

interface Props {
    title: string;
    styleFile: string;
    scriptFile: string;
    publicPath: string;
}

const join = (...path: string[]) => {
    return path.join('').replace(/\/+/g, '/');
};

export function Layout(props: PropsWithChildren<Props>) {
    return (
        <html lang='zh-cmn-Hans-CN'>
            <head>
                <title>{props.title}</title>
                <meta name='charset' content='utf-8' />
                <meta name='author' content='xiao' />
                <meta name='description' content='xiao 的个人博客' />
                <meta name='X-UA-Compatible' content='IE=edge' />
                <meta name='viewport' content='width=device-width, initial-scale=1' />
                <link rel='short icon' href={join(props.publicPath, '/image/favicon.ico')} />
                <link rel='stylesheet' type='text/css' href={join(props.publicPath, props.styleFile)} />
            </head>
            <body>
                <Header />
                <article>
                    {props.children}
                </article>
                <Footer />
                <script type='text/javascript' src={join(props.publicPath, props.scriptFile)} />
            </body>
        </html>
    );
}
