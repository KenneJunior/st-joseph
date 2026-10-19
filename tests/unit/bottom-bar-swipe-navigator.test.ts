import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { BottomBarSwipeNavigator } from '../../src/ui/navigation/BottomBarSwipeNavigator.ts';
import { DockGlider } from '../../src/ui/navigation/DockGlider.ts';

const SWIPE_TEST_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><title>Test</title></head>
<body>
  <header id="mainHeader" style="height: 60px;"></header>
  <main>
    <section id="heroSection">Hero</section>
    <section id="academics">Academics</section>
    <section id="schoolDatesSection">Dates</section>
    <section id="news-events">News</section>
    <section id="results">Results</section>
    <section id="campusMapSection">Map</section>
  </main>

  <nav class="mobile-bottom-bar" id="mobileBottomBar">
    <div class="mobile-bottom-glider" id="mobileBottomGlider"></div>
    <button type="button" class="mobile-bottom-item mobile-bottom-item--theme" id="bottomThemeToggle">Theme</button>
    <a href="#heroSection" class="mobile-bottom-item mobile-bottom-item--home active" data-nav-target="heroSection">Home</a>
    <a href="#academics" class="mobile-bottom-item mobile-bottom-item--academics" data-nav-target="academics">Academics</a>
    <a href="#schoolDatesSection" class="mobile-bottom-item mobile-bottom-item--dates" data-nav-target="schoolDatesSection">Dates</a>
    <a href="#news-events" class="mobile-bottom-item mobile-bottom-item--news" data-nav-target="news-events">News</a>
    <a href="#results" class="mobile-bottom-item mobile-bottom-item--results" data-nav-target="results">Results</a>
    <a href="#campusMapSection" class="mobile-bottom-item mobile-bottom-item--map" data-nav-target="campusMapSection">Map</a>
    <button type="button" class="mobile-bottom-item mobile-bottom-item--reminders" id="bottomMyRemindersBtn">Reminders</button>
    <button type="button" class="mobile-bottom-item mobile-bottom-item--menu" id="bottomNavMenuToggle">Menu</button>
  </nav>
</body>
</html>
`;

describe('BottomBarSwipeNavigator – Swipe-to-Navigate & Tab Order', () => {
    let navigatorInstance: BottomBarSwipeNavigator;
    let bottomBar: HTMLElement;

    beforeEach(() => {
        const dom = new JSDOM(SWIPE_TEST_HTML, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true,
        });

        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
        (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

        // Mock window dimensions for mobile
        Object.defineProperty(dom.window, 'innerWidth', { value: 390, writable: true });
        Object.defineProperty(dom.window, 'scrollTo', { value: vi.fn(), writable: true });

        bottomBar = dom.window.document.getElementById('mobileBottomBar')!;
        Object.defineProperty(bottomBar, 'offsetWidth', { value: 370, configurable: true });
        Object.defineProperty(bottomBar, 'offsetHeight', { value: 52, configurable: true });

        const items = bottomBar.querySelectorAll<HTMLElement>('.mobile-bottom-item');
        items.forEach((item) => {
            Object.defineProperty(item, 'offsetWidth', { value: 36, configurable: true });
            Object.defineProperty(item, 'offsetHeight', { value: 44, configurable: true });
        });

        new DockGlider('mobileBottomBar');
        navigatorInstance = new BottomBarSwipeNavigator(bottomBar, {
            minSwipeDistance: 30,
            maxSwipeDurationMs: 400,
        });
    });

    afterEach(() => {
        navigatorInstance.destroy();
        DockGlider.instance?.destroy();
        vi.restoreAllMocks();
    });

    it('identifies all 9 bottom navigation tabs in canonical order', () => {
        const items = navigatorInstance.getNavItems();
        expect(items).toHaveLength(9);
        expect(items[0].id).toBe('bottomThemeToggle');
        expect(items[1].getAttribute('data-nav-target')).toBe('heroSection');
        expect(items[2].getAttribute('data-nav-target')).toBe('academics');
        expect(items[3].getAttribute('data-nav-target')).toBe('schoolDatesSection');
        expect(items[4].getAttribute('data-nav-target')).toBe('news-events');
        expect(items[5].getAttribute('data-nav-target')).toBe('results');
        expect(items[6].getAttribute('data-nav-target')).toBe('campusMapSection');
        expect(items[7].id).toBe('bottomMyRemindersBtn');
        expect(items[8].id).toBe('bottomNavMenuToggle');
    });

    it('confirms News comes before Results in bottom bar sequence', () => {
        const items = navigatorInstance.getNavItems();
        const newsIndex = items.findIndex((i) => i.getAttribute('data-nav-target') === 'news-events');
        const resultsIndex = items.findIndex((i) => i.getAttribute('data-nav-target') === 'results');

        expect(newsIndex).toBeGreaterThan(-1);
        expect(resultsIndex).toBeGreaterThan(-1);
        expect(newsIndex).toBeLessThan(resultsIndex);
    });

    it('navigates to next tab on swipe left gesture', () => {
        // Start on Home (index 1)
        expect(navigatorInstance.getCurrentIndex()).toBe(1);

        const moved = navigatorInstance.nextTab();
        expect(moved).toBe(true);

        const items = navigatorInstance.getNavItems();
        // Should now be on Academics (index 2)
        expect(navigatorInstance.getCurrentIndex()).toBe(2);
        expect(items[2].classList.contains('active')).toBe(true);
        expect(items[1].classList.contains('active')).toBe(false);
    });

    it('navigates to previous tab on swipe right gesture', () => {
        // Move to Academics (index 2)
        navigatorInstance.nextTab();
        expect(navigatorInstance.getCurrentIndex()).toBe(2);

        // Swipe right -> return to Home (index 1)
        const movedBack = navigatorInstance.prevTab();
        expect(movedBack).toBe(true);
        expect(navigatorInstance.getCurrentIndex()).toBe(1);

        const items = navigatorInstance.getNavItems();
        expect(items[1].classList.contains('active')).toBe(true);
        expect(items[2].classList.contains('active')).toBe(false);
    });

    it('dispatches click on button tabs when navigating to them', () => {
        const items = navigatorInstance.getNavItems();
        const remindersBtn = items[7];
        const clickSpy = vi.fn();
        remindersBtn.addEventListener('click', clickSpy);

        navigatorInstance.goToItem(remindersBtn);
        expect(clickSpy).toHaveBeenCalled();
        expect(remindersBtn.classList.contains('active')).toBe(true);
    });

    it('clamps navigation at tab boundaries', () => {
        // Navigate all the way to last item (index 8)
        for (let i = 0; i < 15; i++) {
            navigatorInstance.nextTab();
        }
        expect(navigatorInstance.getCurrentIndex()).toBe(8);
        expect(navigatorInstance.nextTab()).toBe(false);

        // Navigate all the way back to first item (index 0)
        for (let i = 0; i < 15; i++) {
            navigatorInstance.prevTab();
        }
        expect(navigatorInstance.getCurrentIndex()).toBe(0);
        expect(navigatorInstance.prevTab()).toBe(false);
    });
});
