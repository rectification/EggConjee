import katex from 'katex';
import MarkdownIt from 'markdown-it';

export function MathRender(md: MarkdownIt) {
    const labelMap: Record<string, number> = {};

    md.renderer.rules.math_inline = (tokens, idx) => {
        const math = katex.renderToString(tokens[idx].content, {
            displayMode: false,
            output: 'html',
        });

        return `<span class="inline-formula">${math}</span>`;
    };

    md.renderer.rules.math_block = (tokens, idx, opt, env) => {
        const math = katex.renderToString(tokens[idx].content, {
            displayMode: true,
            output: 'html',
        });

        let current = labelMap[env.label];

        if (!current) {
            current = 1;
            labelMap[env.label] = 2;
        }
        else {
            labelMap[env.label] ++;
        }

        return `<p class="block-formula">${math}<span class="formula-index">(${current})</span></p>`;
    };
}
