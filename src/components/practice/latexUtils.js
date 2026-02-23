import katex from 'katex';

const LATEX_PLACEHOLDER_RE = /\[\[([a-zA-Z][\w-]{0,30})\]\]|\[([a-zA-Z][\w-]{0,30})\]/g;

export function extractLatexPlaceholderIds(latex) {
    const expression = String(latex ?? '');
    const ids = [];
    expression.replace(LATEX_PLACEHOLDER_RE, (_, doubleId, singleId) => {
        const id = String(doubleId || singleId || '').trim();
        if (id && !ids.includes(id)) ids.push(id);
        return '';
    });
    return ids;
}

export function latexWithPlaceholderBoxes(latex) {
    const expression = String(latex ?? '');
    if (!expression) return expression;
    return expression.replace(LATEX_PLACEHOLDER_RE, () => '\\boxed{\\phantom{00}}');
}

export function latexWithInteractivePlaceholders(latex) {
    const expression = String(latex ?? '');
    if (!expression) return expression;
    return expression.replace(LATEX_PLACEHOLDER_RE, (_, doubleId, singleId) => {
        const id = String(doubleId || singleId || '').trim();
        if (!id) return '\\boxed{\\phantom{00}}';
        return `\\htmlData{blank-id=${id}}{\\boxed{\\phantom{00}}}`;
    });
}

export function renderLatexToHtml(latex, displayMode = false) {
    const expression = String(latex ?? '').trim();
    if (!expression) return '';

    try {
        return katex.renderToString(expression, {
            displayMode,
            throwOnError: false,
            strict: 'ignore',
            trust: (context) => {
                const cmd = String(context?.command || '');
                return cmd === '\\htmlData' || cmd === '\\htmlClass';
            },
            output: 'html',
        });
    } catch {
        return expression;
    }
}
