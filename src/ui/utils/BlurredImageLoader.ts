/**
 * ============================================================================
 * SJCCC – Progressive Blurred-Image Loader Utility
 * Orchestrates smooth unblurring and fading from low-resolution placeholders
 * to crisp full-resolution images once fetched by the browser.
 * ============================================================================
 */

export function initBlurredImage(container: HTMLElement): void {
    if (!container || container.dataset.blurredInit === 'true') {
        const fullImg = container.querySelector<HTMLImageElement>('.blurred-img-full, img:not(.blurred-img-placeholder):not(.carousel-image-placeholder):not(.carousel-thumb-placeholder)');
        if (fullImg && fullImg.complete && fullImg.naturalWidth > 0) {
            fullImg.classList.add('is-loaded');
            container.classList.add('is-loaded');
        }
        return;
    }

    const fullImg = container.querySelector<HTMLImageElement>('.blurred-img-full, img:not(.blurred-img-placeholder):not(.carousel-image-placeholder):not(.carousel-thumb-placeholder)');
    if (!fullImg) return;

    container.dataset.blurredInit = 'true';

    const markLoaded = () => {
        fullImg.classList.add('is-loaded');
        container.classList.add('is-loaded');
    };

    if (fullImg.complete && fullImg.naturalWidth > 0) {
        requestAnimationFrame(() => {
            markLoaded();
        });
    } else {
        fullImg.addEventListener('load', markLoaded, { once: true });
        fullImg.addEventListener('error', markLoaded, { once: true });
    }
}

export function initAllBlurredImages(root: ParentNode = document): void {
    const containers = root.querySelectorAll<HTMLElement>('.blurred-img-container');
    containers.forEach((container) => initBlurredImage(container));
}
