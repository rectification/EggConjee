import React from 'react';

import { Layout, LayoutProps } from 'src/template/components/layout';

interface Props extends LayoutProps {
    current: number;
    total: number;
    getUrlByPage: (page: number) => string | null;
    posts: Array<{
        title: string;
        url: string;
        date: number;
    }>;
}

export function Template({ posts, ...rest }: Props) {
    return (
        <Layout {...rest}>
            <div className='archive-timeline'>
                {JSON.stringify(posts)}
            </div>
        </Layout>
    )
}
