Renders one Lucide glyph at the console's 1.5 stroke weight; use it anywhere an icon is needed rather than pasting inline SVG.

```jsx
<Icon name="wallet" size={20} />
```

Sizes: **16** inline, in nav rows and inside buttons; **20** beside a page title (`PageHeader` does this for you). The glyph inherits `currentColor`. Only the glyphs the console actually uses are bundled — see `assets/icons/` for the same set as standalone files. If you need one that is not here, take it from Lucide at stroke 1.5 rather than drawing it.
