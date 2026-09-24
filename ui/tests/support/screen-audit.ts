import type { Page } from '@playwright/test';

/**
 * DRK-1729 — the keyboard and contrast walk over a real screen (DRK-1725 §3 "Every screen —
 * keyboard and contrast"), run the same way on all 6 screens in both themes.
 *
 * A control is anything the operator can use: every link, button, form field, `summary` and tab
 * stop, and every element the pointer treats as clickable (`cursor: pointer`) that sits inside no
 * such control — a list row that opens a record is one. Disabled and undrawn ones are left out.
 * Reading order is document order.
 *
 * Colours are read from the drawn page and turned into sRGB through a canvas, so any CSS colour
 * syntax the console uses is measured the same way. A text's ground is its own and its
 * ancestors' backgrounds laid over one another down to the first opaque one; a focus ring's and a
 * border's ground is the surface of the element it is drawn around. The luminance and contrast
 * formulas are spec 23's (`23-colour-pairs-readable-in-both-themes.spec.ts`), per WCAG 2.
 */

type Rgba = [number, number, number, number];
type Rgb = [number, number, number];

export interface Control {
  id: string;
  label: string;
}

export interface FocusStop {
  /** The control's id, or null for a stop that is no control of the page's own document. */
  id: string | null;
  label: string;
  indicator: boolean;
  ring: { colour: Rgba; ground: Rgba[] } | null;
}

export interface TabWalk {
  controls: Control[];
  stops: FocusStop[];
  /** The theme's `--focus-ring`, the colour Design/README.md draws every focus indicator in. */
  focusRing: Rgba;
}

interface TextSample {
  text: string;
  where: string;
  fg: Rgba;
  opacity: number;
  ground: Rgba[];
}

interface BorderSample {
  where: string;
  border: Rgba;
  fill: Rgba[];
  ground: Rgba[];
}

/**
 * Tags every control with `data-audit-control` and keeps how each one (and the field shell
 * around it) is drawn unfocused. Runs in the page; everything it needs is inside it.
 */
function tagControls(): Array<{ id: string; label: string }> {
  const NATIVE =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"], [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="tab"], [role="combobox"]';
  const drawn = (element: Element): boolean => {
    if (!element.checkVisibility({ checkVisibilityCSS: true })) return false;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
  const usable = (element: Element): boolean =>
    !element.matches(':disabled') && element.getAttribute('aria-disabled') !== 'true' && element.closest('[inert]') === null && element.closest('[data-audit-sentinel]') === null;
  const pointer = (element: Element | null): boolean => element !== null && getComputedStyle(element).cursor === 'pointer';

  // Drawn unfocused: a field focused on arrival (Overview's search) would otherwise keep its
  // ring in the baseline its focused look is compared with.
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

  const found = new Set<Element>();
  for (const element of document.body.querySelectorAll(NATIVE)) found.add(element);
  for (const element of document.body.querySelectorAll('*')) {
    if (pointer(element) && !pointer(element.parentElement) && element.closest(NATIVE) === null) found.add(element);
  }
  const controls = [...found]
    .filter((element) => drawn(element) && usable(element))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  const baseline = new Map<Element, { outline: string; boxShadow: string }>();
  const keep = (element: Element | null): void => {
    if (!element || baseline.has(element)) return;
    const style = getComputedStyle(element);
    baseline.set(element, { outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`, boxShadow: style.boxShadow });
  };
  controls.forEach((element, index) => {
    element.setAttribute('data-audit-control', String(index));
    keep(element);
    keep(element.closest('[data-field-shell]'));
  });
  (window as unknown as { __auditBaseline: typeof baseline }).__auditBaseline = baseline;

  return controls.map((element, index) => ({
    id: String(index),
    label: `${element.tagName.toLowerCase()} "${(element.getAttribute('aria-label') ?? element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50)}"`,
  }));
}

/** Where focus is now, and whether it is drawn. Runs in the page. */
function readFocus(): { kind: 'sentinel' | 'none' | 'stop'; stop?: { id: string | null; label: string; indicator: boolean; ring: { colour: Rgba; ground: Rgba[] } | null } } {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const rgba = (css: string): Rgba => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = 'transparent';
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const canvasColour = (): Rgba => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'Canvas';
    document.documentElement.append(probe);
    const colour = rgba(getComputedStyle(probe).backgroundColor);
    probe.remove();
    return colour;
  };
  const groundOf = (element: Element | null): Rgba[] => {
    const layers: Rgba[] = [];
    for (let node = element; node; node = node.parentElement) {
      const colour = rgba(getComputedStyle(node).backgroundColor);
      if (colour[3] === 0) continue;
      layers.push(colour);
      if (colour[3] === 1) return layers;
    }
    layers.push(canvasColour());
    return layers;
  };

  const active = document.activeElement;
  if (!active || active === document.body || active === document.documentElement) return { kind: 'none' };
  if (active.hasAttribute('data-audit-sentinel')) return { kind: 'sentinel' };
  const id = active.getAttribute('data-audit-control');
  const label = `${active.tagName.toLowerCase()} "${(active.getAttribute('aria-label') ?? active.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50)}"`;
  const baseline = (window as unknown as { __auditBaseline?: Map<Element, { outline: string; boxShadow: string }> }).__auditBaseline ?? new Map();

  for (const target of [active, active.closest('[data-field-shell]')]) {
    if (!target) continue;
    const style = getComputedStyle(target);
    const before = baseline.get(target) ?? { outline: '', boxShadow: 'none' };
    const outline = `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;
    if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0 && rgba(style.outlineColor)[3] > 0 && outline !== before.outline) {
      return { kind: 'stop', stop: { id, label, indicator: true, ring: { colour: rgba(style.outlineColor), ground: groundOf(target.parentElement) } } };
    }
    if (style.boxShadow !== 'none' && style.boxShadow !== before.boxShadow) {
      // The ring is the shadow layer the unfocused control does not draw, and that shows.
      const layers = (shadow: string): string[] => shadow.split(/,(?![^(]*\))/).map((layer) => layer.trim());
      const unfocused = new Set(layers(before.boxShadow));
      const added = layers(style.boxShadow)
        .filter((layer) => !unfocused.has(layer))
        .map((layer) => layer.match(/(?:rgba?|oklch|oklab|lab|lch|hsla?|color)\([^)]*\)/)?.[0])
        .filter((colour): colour is string => colour !== undefined && rgba(colour)[3] > 0);
      if (added.length > 0) return { kind: 'stop', stop: { id, label, indicator: true, ring: { colour: rgba(added[added.length - 1]), ground: groundOf(target.parentElement) } } };
    }
  }
  return { kind: 'stop', stop: { id, label, indicator: false, ring: null } };
}

/**
 * Presses Tab from the top of the page until focus comes back round, recording every stop. A
 * throwaway tab stop at the start of the document marks where the walk began and ended.
 */
export async function tabThrough(page: Page): Promise<TabWalk> {
  const controls = await page.evaluate(tagControls);
  const focusRing = await page.evaluate((): Rgba => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = 'transparent';
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--focus-ring').trim();
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  });
  await page.evaluate(() => {
    const start = document.createElement('button');
    start.setAttribute('data-audit-sentinel', '');
    start.setAttribute('aria-label', 'audit start');
    start.style.position = 'fixed';
    start.style.top = '0';
    start.style.left = '0';
    document.body.prepend(start);
    start.focus();
  });

  const stops: FocusStop[] = [];
  let outside = 0;
  for (let press = 0; press < controls.length * 2 + 40; press += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(readFocus);
    if (focus.kind === 'sentinel') break;
    if (focus.kind === 'none') {
      // Focus left the document (the browser's own controls); two presses bring it back.
      outside += 1;
      if (outside > 3) break;
      continue;
    }
    stops.push(focus.stop!);
  }
  await page.evaluate(() => document.querySelector('[data-audit-sentinel]')?.remove());
  return { controls, stops, focusRing };
}

/** Every control the walk never reached, every control reached out of reading order, every stop
 * drawn with no focus indicator, and every indicator drawn in another colour than `--focus-ring`. */
export function keyboardFindings(walk: TabWalk): { unreached: string[]; outOfOrder: string[]; noIndicator: string[]; offRing: string[] } {
  const reached = new Set(walk.stops.map((stop) => stop.id).filter((id): id is string => id !== null));
  const unreached = walk.controls.filter((control) => !reached.has(control.id)).map((control) => control.label);

  const firstVisits: Array<{ id: string; label: string }> = [];
  for (const stop of walk.stops) {
    if (stop.id !== null && !firstVisits.some((visit) => visit.id === stop.id)) firstVisits.push({ id: stop.id, label: stop.label });
  }
  const outOfOrder: string[] = [];
  firstVisits.forEach((visit, index) => {
    const previous = firstVisits[index - 1];
    if (previous && Number(visit.id) < Number(previous.id)) outOfOrder.push(`${visit.label} after ${previous.label}`);
  });

  // A control is judged by the stop focus enters it on: a native field's own inner stops (a date
  // field's month, day, year and picker button) belong to the browser, not to the console.
  const entries = walk.stops.filter((stop, index) => stop.id !== null && walk.stops[index - 1]?.id !== stop.id);
  const noIndicator = entries.filter((stop) => !stop.indicator).map((stop) => stop.label);
  const offRing = entries
    .filter((stop) => stop.indicator)
    .filter((stop) => !stop.ring || stop.ring.colour[3] < 1 || stop.ring.colour.slice(0, 3).some((channel, index) => Math.abs(channel - walk.focusRing[index]) > 2))
    .map((stop) => `${stop.label} drawn in ${stop.ring ? `rgba(${stop.ring.colour.join(', ')})` : 'no colour'}, not rgba(${walk.focusRing.join(', ')})`);
  return { unreached, outOfOrder, noIndicator: [...new Set(noIndicator)], offRing: [...new Set(offRing)] };
}

/** Every text drawn on the page, and every control border drawn in a colour of its own. Runs in
 * the page. */
function sampleColours(): { texts: TextSample[]; borders: BorderSample[] } {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const rgba = (css: string): Rgba => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = 'transparent';
    context.fillStyle = css;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const probe = document.createElement('div');
  probe.style.backgroundColor = 'Canvas';
  document.documentElement.append(probe);
  const canvasColour = rgba(getComputedStyle(probe).backgroundColor);
  probe.remove();
  const groundOf = (element: Element | null): Rgba[] => {
    const layers: Rgba[] = [];
    for (let node = element; node; node = node.parentElement) {
      const colour = rgba(getComputedStyle(node).backgroundColor);
      if (colour[3] === 0) continue;
      layers.push(colour);
      if (colour[3] === 1) return layers;
    }
    layers.push(canvasColour);
    return layers;
  };
  const opacityOf = (element: Element): number => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity);
    return opacity;
  };
  const where = (element: Element): string => {
    const region = element.closest('[role="region"], [role="dialog"], [data-testid], header, nav, aside, main');
    const regionName = region ? (region.getAttribute('aria-label') ?? region.getAttribute('data-testid') ?? region.tagName.toLowerCase()) : 'page';
    return `${regionName} › ${element.tagName.toLowerCase()}`;
  };
  const drawn = (element: Element): boolean => {
    if (!element.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) return false;
    const box = element.getBoundingClientRect();
    return box.width > 1 && box.height > 1;
  };

  const texts: TextSample[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    let element = node.parentElement;
    if (!text || !element || element.closest('script, style, noscript, template, [data-audit-sentinel]')) continue;
    if (element.tagName === 'OPTION') {
      const select = element.closest('select');
      if (!select || !(element as HTMLOptionElement).selected) continue;
      element = select;
    }
    if (!drawn(element)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    if (![...range.getClientRects()].some((rect) => rect.width > 1 && rect.height > 1)) continue;
    const style = getComputedStyle(element);
    const fg = element instanceof SVGElement ? rgba(style.fill) : rgba(style.color);
    texts.push({ text: text.slice(0, 40), where: where(element), fg, opacity: opacityOf(element), ground: groundOf(element) });
  }
  for (const field of document.body.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea')) {
    if (!drawn(field)) continue;
    const text = field.value || field.placeholder;
    if (!text) continue;
    const colour = field.value ? getComputedStyle(field).color : getComputedStyle(field, '::placeholder').color;
    texts.push({ text: `${field.value ? '' : 'placeholder '}${text.slice(0, 40)}`, where: where(field), fg: rgba(colour), opacity: opacityOf(field), ground: groundOf(field) });
  }

  const borders: BorderSample[] = [];
  for (const control of document.body.querySelectorAll('input:not([type="hidden"]), select, textarea, button, summary, [role="combobox"]')) {
    if (!drawn(control) || control.closest('[data-audit-sentinel]')) continue;
    const style = getComputedStyle(control);
    if (style.borderTopStyle === 'none' || parseFloat(style.borderTopWidth) === 0) continue;
    const border = rgba(style.borderTopColor);
    if (border[3] === 0) continue;
    const label = (control.getAttribute('aria-label') ?? control.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    borders.push({ where: `${where(control)} "${label}"`, border, fill: [rgba(style.backgroundColor), ...groundOf(control.parentElement)], ground: groundOf(control.parentElement) });
  }
  return { texts, borders };
}

/** Lays `layers` (nearest first, the last one opaque) over one another. */
function composite(layers: Rgba[]): Rgb {
  let [r, g, b] = layers[layers.length - 1];
  for (let index = layers.length - 2; index >= 0; index -= 1) {
    const [lr, lg, lb, la] = layers[index];
    [r, g, b] = [lr * la + r * (1 - la), lg * la + g * (1 - la), lb * la + b * (1 - la)];
  }
  return [r, g, b];
}

// Spec 23's formulas, unchanged.
function relativeLuminance([r, g, b]: Rgb): number {
  const [rl, gl, bl] = [r, g, b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function rgbText([r, g, b]: Rgb): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/** The pair's ratio, the foreground laid over its ground at its own alpha. */
function ratioOver(fg: Rgba, groundLayers: Rgba[], opacity = 1): { ratio: number; fg: Rgb; ground: Rgb } {
  const ground = composite(groundLayers);
  const drawnFg = composite([[fg[0], fg[1], fg[2], fg[3] * opacity], [...ground, 1]]);
  return { ratio: contrastRatio(drawnFg, ground), fg: drawnFg, ground };
}

/**
 * Every text under 4.5:1 against its ground, and every focus indicator and control border under
 * 3:1 against its ground — the design system's floors (Design/README.md "Contrast is a
 * constraint", "a focus ring needs 3:1 against the surface beside it").
 */
export async function contrastFindings(page: Page, walk: TabWalk): Promise<{ texts: string[]; rings: string[]; borders: string[] }> {
  const { texts, borders } = await page.evaluate(sampleColours);

  const textFindings = new Set<string>();
  for (const sample of texts) {
    const { ratio, fg, ground } = ratioOver(sample.fg, sample.ground, sample.opacity);
    if (ratio < 4.5) textFindings.add(`${sample.where} "${sample.text}": ${ratio.toFixed(2)}:1, ${rgbText(fg)} on ${rgbText(ground)}`);
  }

  const ringFindings = new Set<string>();
  for (const [index, stop] of walk.stops.entries()) {
    if (stop.id === null || !stop.ring || walk.stops[index - 1]?.id === stop.id) continue;
    const { ratio, fg, ground } = ratioOver(stop.ring.colour, stop.ring.ground);
    if (ratio < 3) ringFindings.add(`focus indicator of ${stop.label}: ${ratio.toFixed(2)}:1, ${rgbText(fg)} on ${rgbText(ground)}`);
  }

  const borderFindings = new Set<string>();
  for (const sample of borders) {
    const fill = composite(sample.fill);
    const { ratio, fg, ground } = ratioOver(sample.border, sample.ground);
    // A border drawn in the control's own fill colour is no edge of its own — the fill is.
    if (fg.every((channel, index) => Math.abs(channel - fill[index]) <= 2)) continue;
    if (ratio < 3) borderFindings.add(`border of ${sample.where}: ${ratio.toFixed(2)}:1, ${rgbText(fg)} on ${rgbText(ground)}`);
  }

  return { texts: [...textFindings], rings: [...ringFindings], borders: [...borderFindings] };
}
