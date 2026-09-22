The statement's range control: a bound display plus preset chips.

```jsx
<DateRangeFilter from="1 Sep 2026" to="21 Sep 2026" preset="30d" onPreset={setPreset} />
```

Presets are 7d / 30d / 90d / This month / All. Keep the value in the query string so the screen can be pasted into a ticket. Where a date feeds a write, block future dates in the picker rather than letting the server refuse them.
