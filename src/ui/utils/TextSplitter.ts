/**
 * ============================================================================
 * SJCCC – Text Splitter Utility
 * Splits HTML text nodes into individually animated word spans
 * ============================================================================
 */

export class TextSplitter {
    static wrapWords(htmlStr: string): string {
        const temp = document.createElement('div');
        temp.innerHTML = htmlStr;
        let wordIndex = 0;

        function traverse(node: Node): void {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue || '';
                const words = text.split(/(\s+)/);
                const fragment = document.createDocumentFragment();

                words.forEach((word) => {
                    if (word.trim().length > 0) {
                        const span = document.createElement('span');
                        span.className = 'word';
                        span.style.setProperty('--word-index', wordIndex.toString());
                        span.textContent = word;
                        fragment.appendChild(span);
                        wordIndex++;
                    } else {
                        fragment.appendChild(document.createTextNode(word));
                    }
                });
                (node as ChildNode).replaceWith(fragment);
            } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'BR') {
                Array.from(node.childNodes).forEach(traverse);
            }
        }

        Array.from(temp.childNodes).forEach(traverse);
        return temp.innerHTML;
    }
}
