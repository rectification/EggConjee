import MarkdownIt from 'markdown-it';

import { toPinyin } from 'src/utils/string';

export function TitleRender(md: MarkdownIt) {
    md.renderer.rules.heading_open = (tokens, idx, ops, env, self) => {
        const head = tokens[idx];
        const text = tokens[idx + 1];

        if (!text || !text.content) {
            return `<${head.tag}>`;
        }

        const id = toPinyin(text.content);

        return `<${head.tag} id="${id}"><a class="anchor" href="#${id}">§</a>`;
    };
}
