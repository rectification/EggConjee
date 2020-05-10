import React from 'react';
import Moment from 'moment';

import { PostData } from 'src/loader/post';
import { Layout, LayoutProps } from 'src/template/components/layout';

type Props = PostData & LayoutProps;

export function Template(props: Props) {
    return (
        <Layout {...props}>
            <section className='post-default'>
                <header className='post-header'>
                    <h1 className='post-header__title'>{props.title}</h1>
                    <time className='post-header__create'>{Moment(props.date).format('yyyy-MM-DD')}</time>
                </header>
                <article
                    className='post-article'
                    dangerouslySetInnerHTML={{ __html: props.html }}
                />
            </section>
        </Layout>
    )
}
