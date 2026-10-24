import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { MobileNavigation } from '../../src/ui/navigation/MobileNavigation.ts';
import { MyRemindersController } from '../../src/features/calendar/MyRemindersController.ts';
import { ScrollSpy } from '../../src/ui/navigation/ScrollSpy.ts';
import { DockGlider } from '../../src/ui/navigation/DockGlider.ts';

const DOCK_APP_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><title>SJCCC Bottom Bar Test</title></head>
<body>
  <header id="mainHeader">
    <button id="menuToggle" class="menu-toggle"><i class="bi bi-list"></i></button>
    <button id="navMyRemindersBtn" class="nav-link--reminders"></button>
    <nav id="navMenu">
      <a href="#heroSection" class="nav-link">Home</a>
      <a href="#academics" class="nav-link">Academics</a>
      <a href="#schoolDatesSection" class="nav-link">Dates</a>
      <a href="#news-events" class="nav-link">News</a>
      <a href="#results" class="nav-link">Results</a>
      <a href="#campusMapSection" class="nav-link">Map</a>
      <a href="#location" class="nav-link">Location</a>
    </nav>
  </header>

  <main>
    <section id="heroSection">Hero</section>
    <section id="academics">Academics</section>
    <section id="schoolDatesSection">Dates</section>
    <section id="news-events">News</section>
    <section id="results">Results</section>
    <section id="campusMapSection">Map</section>
    <section id="location">Location</section>
  </main>

  <nav class="mobile-bottom-bar" id="mobileBottomBar" aria-label="Mobile Navigation">
    <div class="mobile-bottom-progress-track" id="mobileBottomProgressTrack">
      <div class="mobile-bottom-progress-fill" id="mobileBottomProgressFill"></div>
    </div>
    <div class="mobile-bottom-glider" id="mobileBottomGlider"></div>
    <button type="button" class="mobile-bottom-item mobile-bottom-item--theme" id="bottomThemeToggle">Theme</button>
    <a href="#heroSection" class="mobile-bottom-item mobile-bottom-item--home active" data-nav-target="heroSection">Home</a>
    <a href="#academics" class="mobile-bottom-item mobile-bottom-item--academics" data-nav-target="academics">Academics</a>
    <a href="#schoolDatesSection" class="mobile-bottom-item mobile-bottom-item--dates" data-nav-target="schoolDatesSection">Dates</a>
    <a href="#news-events" class="mobile-bottom-item mobile-bottom-item--news" data-nav-target="news-events">News</a>
    <a href="#results" class="mobile-bottom-item mobile-bottom-item--results" data-nav-target="results">Results</a>
    <a href="#campusMapSection" class="mobile-bottom-item mobile-bottom-item--map" data-nav-target="campusMapSection">Map</a>
    <a href="#location" class="mobile-bottom-item mobile-bottom-item--location" data-nav-target="location">Location</a>
    <button type="button" class="mobile-bottom-item mobile-bottom-item--reminders" id="bottomMyRemindersBtn">Reminders</button>
    <button type="button" class="mobile-bottom-item mobile-bottom-item--menu" id="bottomNavMenuToggle">Menu</button>
  </nav>

  <dialog id="myRemindersModal" class="my-reminders-overlay" hidden></dialog>
</body>
</html>
`;

describe('Bottom Nav Pill — Progressive Section Scaling & Active State Revocation', () => {
    let dom: JSDOM;
    let mobileNav: MobileNavigation;
    let remindersController: MyRemindersController;
    let scrollSpy: ScrollSpy;
    let bottomBar: HTMLElement;

    beforeEach(() => {
        dom = new JSDOM(DOCK_APP_HTML, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true,
        });

        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLDialogElement = dom.window.HTMLDialogElement;
        (globalThis as any).Node = dom.window.Node;
        (globalThis as any).localStorage = dom.window.localStorage;
        (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0);
        (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

        Object.defineProperty(dom.window, 'innerWidth', { value: 375, writable: true });
        Object.defineProperty(dom.window, 'scrollTo', { value: vi.fn(), writable: true });

        bottomBar = dom.window.document.getElementById('mobileBottomBar')!;
        Object.defineProperty(bottomBar, 'offsetWidth', { value: 360, configurable: true, writable: true });
        Object.defineProperty(bottomBar, 'getBoundingClientRect', {
            value: () => ({ left: 10, width: bottomBar.offsetWidth, top: 600, right: 370, bottom: 652, height: 52 }),
            configurable: true,
        });

        const items = bottomBar.querySelectorAll<HTMLElement>('.mobile-bottom-item');
        items.forEach((item, index) => {
            Object.defineProperty(item, 'offsetWidth', { value: 45, configurable: true, writable: true });
            Object.defineProperty(item, 'offsetHeight', { value: 46, configurable: true });
            Object.defineProperty(item, 'getBoundingClientRect', {
                value: () => ({ left: 10 + index * 48, width: 45, top: 603, right: 10 + index * 48 + 45, bottom: 649, height: 46 }),
                configurable: true,
            });
        });

        scrollSpy = new ScrollSpy('#navMenu a.nav-link');
        mobileNav = new MobileNavigation('menuToggle', 'navMenu', 'mainHeader');
        remindersController = MyRemindersController.getInstance();
        remindersController.init();
    });

    afterEach(() => {
        mobileNav.closeMenu();
        remindersController.close();
        remindersController.destroy();
        scrollSpy.destroy();
        DockGlider.instance?.destroy();
        vi.restoreAllMocks();
    });

    describe('1. Progressive Scaling According to Pill Length', () => {
        it('assigns tier 4 (minimum 4 sections) when pill width is narrow (< 410px)', () => {
            Object.defineProperty(bottomBar, 'offsetWidth', { value: 360, configurable: true });
            mobileNav.updatePillScale();

            expect(bottomBar.getAttribute('data-pill-tier')).toBe('4');
        });

        it('assigns tier 5 (5 sections) when pill width scales to >= 410px', () => {
            Object.defineProperty(bottomBar, 'offsetWidth', { value: 430, configurable: true });
            mobileNav.updatePillScale();

            expect(bottomBar.getAttribute('data-pill-tier')).toBe('5');
        });

        it('assigns tier 6 (6 sections) when pill width scales to >= 500px', () => {
            Object.defineProperty(bottomBar, 'offsetWidth', { value: 540, configurable: true });
            mobileNav.updatePillScale();

            expect(bottomBar.getAttribute('data-pill-tier')).toBe('6');
        });

        it('assigns tier 7 (7 sections) when pill width scales to >= 580px', () => {
            Object.defineProperty(bottomBar, 'offsetWidth', { value: 600, configurable: true });
            mobileNav.updatePillScale();

            expect(bottomBar.getAttribute('data-pill-tier')).toBe('7');
        });

        it('includes the first section (Home), middle sections (Academics, Map) and second-to-last section (Location)', () => {
            const home = bottomBar.querySelector('.mobile-bottom-item--home');
            const academics = bottomBar.querySelector('.mobile-bottom-item--academics');
            const map = bottomBar.querySelector('.mobile-bottom-item--map');
            const location = bottomBar.querySelector('.mobile-bottom-item--location');

            expect(home).not.toBeNull();
            expect(academics).not.toBeNull();
            expect(map).not.toBeNull();
            expect(location).not.toBeNull();

            expect(home!.getAttribute('data-nav-target')).toBe('heroSection');
            expect(location!.getAttribute('data-nav-target')).toBe('location');
        });
    });

    describe('2. Active State Handling — Reminder Button & Modal Closure', () => {
        it('activates Reminders button when opened and revokes active class when modal is closed', () => {
            const remindersBtn = document.getElementById('bottomMyRemindersBtn')!;
            const homeLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--home')!;

            expect(homeLink.classList.contains('active')).toBe(true);
            expect(remindersBtn.classList.contains('active')).toBe(false);

            // Open Reminders modal
            remindersController.open();

            expect(remindersBtn.classList.contains('active')).toBe(true);
            expect(remindersBtn.getAttribute('aria-expanded')).toBe('true');
            expect(homeLink.classList.contains('active')).toBe(false);

            // Close Reminders modal
            remindersController.close();

            // ACTIVE CLASS MUST BE REVOKED!
            expect(remindersBtn.classList.contains('active')).toBe(false);
            expect(remindersBtn.getAttribute('aria-expanded')).toBe('false');

            // Active class is restored to the section tab
            expect(homeLink.classList.contains('active')).toBe(true);
        });

        it('revokes active class from Reminders button when modal backdrop is clicked', () => {
            const remindersBtn = document.getElementById('bottomMyRemindersBtn')!;
            const modal = document.getElementById('myRemindersModal')!;

            remindersController.open();
            expect(remindersBtn.classList.contains('active')).toBe(true);

            // Simulate clicking on the modal backdrop
            modal.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

            expect(remindersBtn.classList.contains('active')).toBe(false);
            expect(remindersBtn.getAttribute('aria-expanded')).toBe('false');
        });

        it('revokes active class from Reminders button when Escape key is pressed', () => {
            const remindersBtn = document.getElementById('bottomMyRemindersBtn')!;

            remindersController.open();
            expect(remindersBtn.classList.contains('active')).toBe(true);

            // Simulate pressing Escape
            document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));

            expect(remindersBtn.classList.contains('active')).toBe(false);
            expect(remindersBtn.getAttribute('aria-expanded')).toBe('false');
        });
    });

    describe('3. Active State Handling — Menu Button & Drawer Closure', () => {
        it('activates Menu toggle when opened and revokes active class when menu drawer is closed', () => {
            const menuToggle = document.getElementById('bottomNavMenuToggle')!;
            const homeLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--home')!;

            expect(menuToggle.classList.contains('active')).toBe(false);

            // Open drawer via bottom toggle
            mobileNav.toggleMenu();

            expect(menuToggle.classList.contains('active')).toBe(true);
            expect(menuToggle.getAttribute('aria-expanded')).toBe('true');
            expect(homeLink.classList.contains('active')).toBe(false);

            // Close drawer
            mobileNav.closeMenu();

            // ACTIVE CLASS MUST BE REVOKED!
            expect(menuToggle.classList.contains('active')).toBe(false);
            expect(menuToggle.getAttribute('aria-expanded')).toBe('false');
            expect(homeLink.classList.contains('active')).toBe(true);
        });

        it('revokes active class from Menu toggle when toggling off with a second click', () => {
            const menuToggle = document.getElementById('bottomNavMenuToggle')!;
            const homeLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--home')!;

            mobileNav.toggleMenu(); // open
            expect(menuToggle.classList.contains('active')).toBe(true);

            mobileNav.toggleMenu(); // close
            expect(menuToggle.classList.contains('active')).toBe(false);
            expect(homeLink.classList.contains('active')).toBe(true);
        });

        it('revokes active class from Menu toggle when clicking outside the menu', () => {
            const menuToggle = document.getElementById('bottomNavMenuToggle')!;
            const navMenu = document.getElementById('navMenu')!;

            mobileNav.toggleMenu();
            expect(menuToggle.classList.contains('active')).toBe(true);

            // Click outside navMenu (on main)
            const outsideEl = document.querySelector('main')!;
            outsideEl.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

            expect(menuToggle.classList.contains('active')).toBe(false);
            expect(navMenu.classList.contains('active')).toBe(false);
        });

        it('revokes active class from Menu toggle when a navigation link is clicked in drawer', () => {
            const menuToggle = document.getElementById('bottomNavMenuToggle')!;
            const academicsDrawerLink = document.querySelector<HTMLAnchorElement>('#navMenu a[href="#academics"]')!;
            const academicsBottomLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--academics')!;

            mobileNav.toggleMenu();
            expect(menuToggle.classList.contains('active')).toBe(true);

            // User taps a link in the drawer
            academicsDrawerLink.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

            // Menu active revoked, target section in bottom bar becomes active
            expect(menuToggle.classList.contains('active')).toBe(false);
            expect(academicsBottomLink.classList.contains('active')).toBe(true);
        });
    });

    describe('4. Dynamic Active Section & Progress Tracking on Scroll', () => {
        beforeEach(() => {
            // Configure document scroll measurements
            Object.defineProperty(dom.window.document.documentElement, 'scrollHeight', {
                value: 4400,
                configurable: true,
            });
            Object.defineProperty(dom.window, 'innerHeight', {
                value: 800,
                configurable: true,
            });

            // Set section offsets
            const sections = [
                { id: 'heroSection', top: 0, height: 600 },
                { id: 'academics', top: 600, height: 600 },
                { id: 'schoolDatesSection', top: 1200, height: 600 },
                { id: 'news-events', top: 1800, height: 600 },
                { id: 'results', top: 2400, height: 600 },
                { id: 'campusMapSection', top: 3000, height: 600 },
                { id: 'location', top: 3600, height: 800 },
            ];

            sections.forEach(({ id, top, height }) => {
                const el = dom.window.document.getElementById(id);
                if (el) {
                    Object.defineProperty(el, 'offsetTop', { value: top, configurable: true });
                    Object.defineProperty(el, 'offsetHeight', { value: height, configurable: true });
                    Object.defineProperty(el, 'getBoundingClientRect', {
                        value: () => {
                            const scrollY = dom.window.scrollY || 0;
                            const relTop = top - scrollY;
                            return {
                                top: relTop,
                                bottom: relTop + height,
                                height,
                                left: 0,
                                right: 375,
                                width: 375,
                            };
                        },
                        configurable: true,
                    });
                }
            });
        });

        it('computes scroll progress and applies hardware-accelerated scaleX to the progress fill', () => {
            const fill = document.getElementById('mobileBottomProgressFill')!;

            // At top (scrollY = 0)
            Object.defineProperty(dom.window, 'scrollY', { value: 0, configurable: true });
            scrollSpy.updateScrollProgressAndActiveSection();

            expect(scrollSpy.getScrollProgress()).toBe(0);
            expect(fill.style.transform).toBe('scaleX(0)');
            expect(bottomBar.getAttribute('data-scroll-progress')).toBe('0');

            // At halfway (scrollY = 1800 of 3600 max scroll)
            Object.defineProperty(dom.window, 'scrollY', { value: 1800, configurable: true });
            scrollSpy.updateScrollProgressAndActiveSection();

            expect(scrollSpy.getScrollProgress()).toBe(0.5);
            expect(fill.style.transform).toBe('scaleX(0.5)');
            expect(bottomBar.style.getPropertyValue('--scroll-progress')).toBe('50.0%');
            expect(bottomBar.getAttribute('data-scroll-progress')).toBe('50');

            // At bottom (scrollY = 3600)
            Object.defineProperty(dom.window, 'scrollY', { value: 3600, configurable: true });
            scrollSpy.updateScrollProgressAndActiveSection();

            expect(scrollSpy.getScrollProgress()).toBe(1);
            expect(fill.style.transform).toBe('scaleX(1)');
            expect(bottomBar.getAttribute('data-scroll-progress')).toBe('100');
        });

        it('dynamically switches active section in bottom pill based on scroll position', () => {
            const homeLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--home')!;
            const academicsLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--academics')!;

            // Scroll to top: Home is active
            Object.defineProperty(dom.window, 'scrollY', { value: 0, configurable: true });
            scrollSpy.updateScrollProgressAndActiveSection();
            expect(homeLink.classList.contains('active')).toBe(true);
            expect(academicsLink.classList.contains('active')).toBe(false);

            // Scroll into Academics (scrollY = 700)
            Object.defineProperty(dom.window, 'scrollY', { value: 700, configurable: true });
            scrollSpy.updateScrollProgressAndActiveSection();
            expect(scrollSpy.getActiveSectionId()).toBe('academics');
            expect(homeLink.classList.contains('active')).toBe(false);
            expect(academicsLink.classList.contains('active')).toBe(true);
            expect(academicsLink.getAttribute('aria-current')).toBe('location');
        });

        it('marks passed sections with is-passed and keeps upcoming sections unpassed', () => {
            const homeLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--home')!;
            const academicsLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--academics')!;
            const mapLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--map')!;
            const locationLink = bottomBar.querySelector<HTMLElement>('.mobile-bottom-item--location')!;

            // When in Academics:
            // Home is passed, Academics is active (not passed), Map and Location are unpassed
            Object.defineProperty(dom.window, 'scrollY', { value: 700, configurable: true });
            scrollSpy.updateScrollProgressAndActiveSection();

            expect(homeLink.classList.contains('is-passed')).toBe(true);
            expect(homeLink.classList.contains('active')).toBe(false);

            expect(academicsLink.classList.contains('active')).toBe(true);
            expect(academicsLink.classList.contains('is-passed')).toBe(false);

            expect(mapLink.classList.contains('is-passed')).toBe(false);
            expect(locationLink.classList.contains('is-passed')).toBe(false);

            // Scroll near the very bottom to Location
            Object.defineProperty(dom.window, 'scrollY', { value: 3600, configurable: true });
            scrollSpy.updateScrollProgressAndActiveSection();

            expect(homeLink.classList.contains('is-passed')).toBe(true);
            expect(academicsLink.classList.contains('is-passed')).toBe(true);
            expect(mapLink.classList.contains('is-passed')).toBe(true);
            expect(locationLink.classList.contains('active')).toBe(true);
            expect(locationLink.classList.contains('is-passed')).toBe(false);

            // Scroll back up to Home
            Object.defineProperty(dom.window, 'scrollY', { value: 0, configurable: true });
            scrollSpy.updateScrollProgressAndActiveSection();

            expect(homeLink.classList.contains('active')).toBe(true);
            expect(homeLink.classList.contains('is-passed')).toBe(false);
            expect(academicsLink.classList.contains('is-passed')).toBe(false);
            expect(mapLink.classList.contains('is-passed')).toBe(false);
            expect(locationLink.classList.contains('is-passed')).toBe(false);
        });

        it('dispatches scroll event and throttles via requestAnimationFrame', async () => {
            const fill = document.getElementById('mobileBottomProgressFill')!;

            Object.defineProperty(dom.window, 'scrollY', { value: 1800, configurable: true });
            dom.window.dispatchEvent(new dom.window.Event('scroll'));

            // Allow requestAnimationFrame / setTimeout tick to run
            await new Promise((resolve) => setTimeout(resolve, 15));

            expect(fill.style.transform).toBe('scaleX(0.5)');
            expect(bottomBar.getAttribute('data-scroll-progress')).toBe('50');
        });
    });
});

