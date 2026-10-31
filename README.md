# Mkraftman Samsung D-pad

Custom HACS Lovelace card: a mini d-pad for Samsung TVs (core `samsungtv` integration) via `remote.send_command`.

## Features

- Back icon (`mdi:arrow-u-left-top`) for the dashboard: tap sends `KEY_RETURN`, long-press (500 ms) drops a 3x3 d-pad overlay down from the top of the screen
- D-pad keys: Home, Up, Menu (cog) / Left, OK, Right / Back, Down, Close
- Sends `KEY_HOME`, `KEY_UP`, `KEY_MENU`, `KEY_LEFT`, `KEY_ENTER`, `KEY_RIGHT`, `KEY_RETURN`, `KEY_DOWN`
- Overlay stays open between presses; Close or tapping outside dismisses it
- Overlay is attached to the page body while open, so it covers the full width including the sidebar
- Same iOS-style key styling as the Sky Q numpad

## Configuration

```yaml
type: custom:mkraftman-samsung-dpad
entity: remote.living_room_samsung_tv
color: "#5E5E94"                 # optional, trigger icon colour (default #A9A9A9)
icon: mdi:arrow-u-left-top       # optional
size: 90%                        # optional, % of card width or px (default 90%)
height: clamp(45px, 9vw, 70px)   # optional, trigger height
```

## Releasing

Bump the version in `VERSION` (e.g. `1.0.1`) and push to `main`. The release workflow creates the matching `vX.Y.Z` tag and GitHub release with `dist/mkraftman-samsung-dpad.js` attached. Pushing a `vX.Y.Z` tag directly also still works.
