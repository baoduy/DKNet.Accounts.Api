A currency code with its flag — every site that names a currency: table cells, tile captions, panel fields, group balance lines.

```jsx
<Currency code="SGD" />   // 🇸🇬 SGD
<Currency code="XAU" />   // XAU — no country, empty 19px slot, no substitute glyph
```

The code is always rendered; the flag never stands alone. XAU, XAG and XDR have no country and EUR maps to a union — those show the code in the reserved slot with **no** globe or question-mark substitute, because an invented symbol implies a fact that is not there.

**Flags are emoji here only so the artifact stays self-contained.** Windows renders 🇸🇬 as the letters *SG*. Production should ship a real flag set (`flag-icons` or inline SVG) keyed by ISO 3166-1 alpha-2.
