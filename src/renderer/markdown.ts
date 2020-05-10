import MarkdownIt from 'markdown-it';

import MarkdownSub from 'markdown-it-sub';
import MarkdownSup from 'markdown-it-sup';
import MarkdownMark from 'markdown-it-mark';
import MarkdownKatex from 'markdown-it-katex';
import MarkdownAttrs from 'markdown-it-attrs';
import MarkdownFootnote from 'markdown-it-footnote';

import { TitleRender } from './title';
import { ParagraphRender } from './paragraph';

export const Markdown = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
});

Markdown
    .use(MarkdownSub)
    .use(MarkdownSup)
    .use(MarkdownMark)
    .use(MarkdownKatex)
    .use(MarkdownFootnote)
    .use(MarkdownAttrs, {
        leftDelimiter: '{',
        rightDelimiter: '}',
        allowedAttributes: ['id', 'class'],
    })
    .use(ParagraphRender)
    .use(TitleRender);
