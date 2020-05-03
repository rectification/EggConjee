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

export function Template(props: Props) {
    return (
        <Layout {...props}>
            posts
        </Layout>
    )
}
