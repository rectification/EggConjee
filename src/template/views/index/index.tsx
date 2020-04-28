import React from 'react';

import { Layout } from 'src/template/components/layout';

interface Props {
    title: string;
    styleFile: string;
    scriptFile: string;
    next: string | null;
    pre: string | null;
    posts: Array<{
        title: string;
        url: string;
        tags: string[];
        create: number;
        description: string;
    }>;
}

export function Template(props: Props) {
    return (
        <Layout
            styleFile={props.styleFile}
            scriptFile={props.scriptFile}
            title={props.title}
        >
            index
        </Layout>
    )
}
