An immediate-effect toggle.

```jsx
<Switch checked={isActive} onChange={onToggle} label="Active" />
```

Switch for a setting that takes effect on flip; `Checkbox` for a value inside a form that is submitted. Never use a switch for something that needs a confirm step — currency deactivation, for instance, is a dialog because it changes what open-account and record-posting will accept.
