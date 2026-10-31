# Mkraftman Samsung D-pad

Custom HACS Lovelace card: a mini d-pad for Samsung TVs (core `samsungtv` integration) via `remote.send_command`.

## Features

- Gamepad icon that drops a 3x3 d-pad overlay down from the top of the screen
- Keys: Home, Up, Close / Left, OK, Right / Back, Down, Power
- Sends `KEY_HOME`, `KEY_UP`, `KEY_LEFT`, `KEY_ENTER`, `KEY_RIGHT`, `KEY_RETURN`, `KEY_DOWN`
- Power toggles `media_entity` (`turn_off` when on, `turn_on` otherwise, so a SmartThings wake-up automation can handle power-on); falls back to `KEY_POWER` if no `media_entity` is set
- Overlay stays open between presses; Close or tapping outside dismisses it
- Same iOS-style key styling as the Sky Q numpad
- Back key uses `/local/icons/exit.svg`

## Configuration

```yaml
type: custom:mkraftman-samsung-dpad
entity: remote.living_room_samsung_tv
media_entity: media_player.living_room_samsung_tv
color: "#5E5E94"                 # optional, trigger icon colour (default #A9A9A9)
icon: mdi:gamepad                # optional
size: 90%                        # optional, % of card width or px (default 90%)
height: clamp(45px, 9vw, 70px)   # optional, trigger height
```

## Releasing

Bump the version in `VERSION` (e.g. `1.0.1`) and push to `main`. The release workflow creates the matching `vX.Y.Z` tag and GitHub release with `dist/mkraftman-samsung-dpad.js` attached. Pushing a `vX.Y.Z` tag directly also still works.
