import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { VirtualCampusMap } from '../../src/features/campus/VirtualCampusMap.ts';
import { CAMPUS_ZONES } from '../../src/data/campusZones.ts';

describe('VirtualCampusMap Marker Tooltips', () => {
    let dom: JSDOM;

    beforeEach(() => {
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head></head>
            <body>
                <div id="campusMapContainer">
                    <button class="map-zone-btn active" data-zone-id="chapel"></button>
                    <button class="map-zone-btn" data-zone-id="workshops-electrical"></button>

                    <div id="campusMapCanvasWrap">
                        <div id="campusMapContent">
                            <button class="map-hotspot-pin active" data-zone-id="chapel" id="pin-chapel">
                                <span class="map-pin-core">Icon</span>
                                <span class="map-pin-label">Chapel</span>
                            </button>
                            <button class="map-hotspot-pin" data-zone-id="workshops-electrical" id="pin-workshops">
                                <span class="map-pin-core">Icon</span>
                                <span class="map-pin-label">Workshops</span>
                            </button>
                        </div>
                    </div>

                    <div id="mapDetailCard">
                        <img id="mapDetailImage" src="" alt="" />
                        <span id="mapDetailCategory"></span>
                        <h3 id="mapDetailTitle"></h3>
                        <p id="mapDetailTagline"></p>
                        <p id="mapDetailDesc"></p>
                        <ul id="mapDetailAmenities"></ul>
                        <span id="mapDetailHours"></span>
                        <span id="mapDetailHead"></span>
                    </div>

                    <div id="a11y-announcer"></div>
                </div>
            </body>
            </html>
        `, {
            url: 'https://saintjosephcollege.vercel.app/',
            pretendToBeVisual: true
        });

        (globalThis as any).window = dom.window;
        (globalThis as any).document = dom.window.document;
        (globalThis as any).HTMLElement = dom.window.HTMLElement;
        (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
        (globalThis as any).MouseEvent = dom.window.MouseEvent;
        (globalThis as any).FocusEvent = dom.window.FocusEvent;
        (globalThis as any).KeyboardEvent = dom.window.KeyboardEvent;
        (globalThis as any).IntersectionObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    });

    afterEach(() => {
        // cleanup
    });

    it('initializes and injects preview tooltips into markers displaying area title and tagline', () => {
        new VirtualCampusMap('campusMapContainer');

        const chapelPin = dom.window.document.getElementById('pin-chapel');
        expect(chapelPin).not.toBeNull();

        const tooltip = chapelPin?.querySelector<HTMLElement>('.map-pin-tooltip');
        expect(tooltip).not.toBeNull();
        expect(tooltip?.getAttribute('role')).toBe('tooltip');

        const chapelZone = CAMPUS_ZONES.find((z) => z.id === 'chapel')!;
        expect(tooltip?.textContent).toContain(chapelZone.title);
        expect(tooltip?.textContent).toContain(chapelZone.tagline);
        expect(tooltip?.textContent).toContain(chapelZone.category);
    });

    it('toggles has-tooltip-visible class on mouseenter and mouseleave', () => {
        new VirtualCampusMap('campusMapContainer');

        const pin = dom.window.document.getElementById('pin-chapel') as HTMLButtonElement;
        expect(pin.classList.contains('has-tooltip-visible')).toBe(false);

        // Hover in
        pin.dispatchEvent(new dom.window.MouseEvent('mouseenter'));
        expect(pin.classList.contains('has-tooltip-visible')).toBe(true);

        // Hover out
        pin.dispatchEvent(new dom.window.MouseEvent('mouseleave'));
        expect(pin.classList.contains('has-tooltip-visible')).toBe(false);
    });

    it('toggles has-tooltip-visible class on focus and blur for keyboard users', () => {
        new VirtualCampusMap('campusMapContainer');

        const pin = dom.window.document.getElementById('pin-workshops') as HTMLButtonElement;
        expect(pin.classList.contains('has-tooltip-visible')).toBe(false);

        // Focus
        pin.dispatchEvent(new dom.window.FocusEvent('focus'));
        expect(pin.classList.contains('has-tooltip-visible')).toBe(true);

        // Blur
        pin.dispatchEvent(new dom.window.FocusEvent('blur'));
        expect(pin.classList.contains('has-tooltip-visible')).toBe(false);
    });

    it('allows clicking markers to select campus zones while tooltips are present', async () => {
        new VirtualCampusMap('campusMapContainer');

        const workshopsPin = dom.window.document.getElementById('pin-workshops') as HTMLButtonElement;
        workshopsPin.click();

        expect(workshopsPin.classList.contains('active')).toBe(true);
        expect(workshopsPin.getAttribute('aria-selected')).toBe('true');

        // Await the smooth transition timeout
        await new Promise((resolve) => setTimeout(resolve, 150));

        const detailTitle = dom.window.document.getElementById('mapDetailTitle');
        const workshopsZone = CAMPUS_ZONES.find((z) => z.id === 'workshops-electrical')!;
        expect(detailTitle?.textContent).toBe(workshopsZone.title);
    });
});
