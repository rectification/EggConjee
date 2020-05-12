import MarkdownIt from 'markdown-it';

export function ImageRender(md: MarkdownIt) {
    md.renderer.rules.image = (tokens, idx) => {
        const token = tokens[idx];
        const src = token.attrGet('src');
        const alt = (token.children || [])[0]?.content || '';
        const image = `<img class="image-inner" src="${src}" alt="${alt}">`;
        const imageTitle = alt ? `<span class="image-title">${alt}</span>` : '';

        return `<span class="image-block">${image}${imageTitle}</span>`;
    };
}
