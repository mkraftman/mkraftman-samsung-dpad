/**
 * mkraftman-samsung-dpad
 * Mini d-pad for Samsung TVs via remote.send_command.
 * Shows an exit icon: tap sends KEY_EXIT (configurable), long-press drops a 3x3 d-pad
 * overlay down from the top.
 */

const HOLD_MS = 500;

const DPAD_KEYS = [
  { key: "home", icon: "mdi:home-outline", command: "KEY_HOME" },
  { key: "up", icon: "mdi:chevron-up", command: "KEY_UP" },
  { key: "menu", icon: "mdi:cog-outline", command: "KEY_MENU" },
  { key: "left", icon: "mdi:chevron-left", command: "KEY_LEFT" },
  { key: "ok", icon: "mdi:circle-medium", command: "KEY_ENTER" },
  { key: "right", icon: "mdi:chevron-right", command: "KEY_RIGHT" },
  // Like the Samsung remote's Back key: tap = back, hold = exit
  { key: "back", icon: "mdi:arrow-u-left-top", command: "KEY_RETURN", hold: "KEY_EXIT" },
  { key: "down", icon: "mdi:chevron-down", command: "KEY_DOWN" },
  { key: "close", icon: "mdi:keyboard-close-outline", action: "close", flip: true },
];

class MkraftmanSamsungDpad extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._el = {};
    this._built = false;
    this._resizeObserver = null;
  }

  static getStubConfig() {
    return { entity: "remote.living_room_samsung_tv" };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("You must specify an 'entity'");
    this._config = {
      icon: "mdi:close-box-outline",
      tap_command: "KEY_EXIT",
      color: "#A9A9A9",
      size: "90%",
      height: "clamp(45px, 9vw, 70px)",
      ...config,
    };
    if (this._built) {
      this._built = false;
      this._build();
    } else if (this._hass) {
      this._build();
    }
  }

  getCardSize() {
    return 1;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) this._build();
  }

  _build() {
    if (this._built || !this._hass || !this._config) return;
    const c = this._config;

    const keysHtml = DPAD_KEYS.map((k) => {
      let attr = k.action ? `data-action="${k.action}"` : `data-command="${k.command}"`;
      if (k.hold) attr += ` data-hold="${k.hold}"`;
      const inner = `<ha-icon icon="${k.icon}"${k.flip ? ' class="flip"' : ""}></ha-icon>`;
      return `<button class="dpad-key" ${attr} aria-label="${k.key}">${inner}</button>`;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .trigger {
          width: 100%;
          height: ${c.height};
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
          color: ${c.color};
          transition: opacity 0.15s;
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          touch-action: manipulation;
        }
        .trigger:active {
          opacity: 0.6;
        }

      </style>

      <button class="trigger" id="trigger" aria-label="D-pad">
        <ha-icon icon="${c.icon}" id="triggerIcon"></ha-icon>
      </button>

    `;

    // Overlay lives in its own host attached to document.body while open, so no
    // ancestor (transforms, stacking contexts, sidebar) can clip or cover it.
    if (this._portal) this._portal.remove();
    this._portal = document.createElement("div");
    this._portal.setAttribute("data-mkraftman-samsung-dpad", "");
    const ps = this._portal.attachShadow({ mode: "open" });
    ps.innerHTML = `
      <style>
        /* Scrim - tap anywhere outside the d-pad to close */
        .dpad-scrim {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9998;
          background: transparent;
        }

        /* D-pad overlay - drops down from the top */
        .dpad-overlay {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: #d1d5db;
          padding: 8px 4px;
          padding-top: calc(8px + env(safe-area-inset-top, 0px));
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          border-radius: 0 0 24px 24px;
        }
        .dpad-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          max-width: 400px;
          margin: 0 auto;
        }
        .dpad-key {
          height: 46px;
          border-radius: 6px;
          border: none;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          touch-action: manipulation;
          box-shadow: 0 1px 0 rgba(0,0,0,0.3);
        }
        .dpad-key:active {
          background: #c8c8c8;
        }
        .dpad-key ha-icon {
          --mdc-icon-size: 36px;
          color: #1c1c1e;
          pointer-events: none;
        }
        .dpad-key ha-icon.flip {
          transform: scaleY(-1);
        }
      </style>
      <div class="dpad-scrim" id="scrim"></div>
      <div class="dpad-overlay" id="overlay">
        <div class="dpad-grid">${keysHtml}</div>
      </div>
    `;

    const s = this.shadowRoot;
    this._el.trigger = s.getElementById("trigger");
    this._el.triggerIcon = s.getElementById("triggerIcon");
    this._el.overlay = ps.getElementById("overlay");
    this._el.scrim = ps.getElementById("scrim");

    // Trigger: tap = Back (KEY_RETURN), long-press = open d-pad
    const t = this._el.trigger;
    const cancelHold = () => {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    };
    t.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      this._held = false;
      cancelHold();
      this._holdTimer = setTimeout(() => {
        this._holdTimer = null;
        this._held = true;
        this._open();
      }, HOLD_MS);
    });
    t.addEventListener("pointerup", cancelHold);
    t.addEventListener("pointercancel", cancelHold);
    t.addEventListener("pointerleave", cancelHold);
    t.addEventListener("contextmenu", (e) => e.preventDefault());
    t.addEventListener("click", () => {
      if (this._held) {
        this._held = false;
        return;
      }
      this._sendCommand(this._config.tap_command);
    });

    // Ignore the click that can land on the scrim as the long-press finger lifts
    this._el.scrim.addEventListener("click", () => {
      if (Date.now() - this._openedAt < 400) return;
      this._close();
    });

    // D-pad keys with a hold command (Back): hold sends it instead of the tap command
    const ov = this._el.overlay;
    const cancelKeyHold = () => {
      clearTimeout(this._keyHoldTimer);
      this._keyHoldTimer = null;
    };
    ov.addEventListener("pointerdown", (e) => {
      const key = e.target.closest(".dpad-key[data-hold]");
      this._keyHeld = null;
      cancelKeyHold();
      if (!key || (e.button !== undefined && e.button !== 0)) return;
      this._keyHoldTimer = setTimeout(() => {
        this._keyHoldTimer = null;
        this._keyHeld = key;
        this._sendCommand(key.dataset.hold);
      }, HOLD_MS);
    });
    ov.addEventListener("pointerup", cancelKeyHold);
    ov.addEventListener("pointercancel", cancelKeyHold);
    ov.addEventListener("pointerout", (e) => {
      if (e.target.closest && e.target.closest(".dpad-key[data-hold]")) cancelKeyHold();
    });
    ov.addEventListener("contextmenu", (e) => e.preventDefault());

    ov.addEventListener("click", (e) => {
      const key = e.target.closest(".dpad-key");
      if (!key) return;
      if (this._keyHeld === key) {
        this._keyHeld = null;
        return;
      }
      const command = key.dataset.command;
      const action = key.dataset.action;
      if (command) {
        this._sendCommand(command);
      } else if (action === "close") {
        this._close();
      }
    });

    // Size the trigger icon like button-card's percentage `size` (share of card width)
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this._resizeObserver = new ResizeObserver(() => this._sizeTriggerIcon());
    this._resizeObserver.observe(this._el.trigger);
    this._sizeTriggerIcon();

    this._built = true;
  }

  _sizeTriggerIcon() {
    if (!this._el.trigger || !this._el.triggerIcon) return;
    const size = String(this._config.size).trim();
    let px;
    if (size.endsWith("%")) {
      px = (this._el.trigger.clientWidth * parseFloat(size)) / 100;
    } else {
      px = parseFloat(size);
    }
    if (px > 0) this._el.triggerIcon.style.setProperty("--mdc-icon-size", `${px}px`);
  }

  _open() {
    this._openedAt = Date.now();
    if (this._portal && !this._portal.isConnected) document.body.appendChild(this._portal);
  }

  _close() {
    if (this._portal && this._portal.isConnected) this._portal.remove();
  }

  _sendCommand(command) {
    if (!this._hass || !this._config) return;
    this._hass.callService("remote", "send_command", {
      entity_id: this._config.entity,
      command: command,
    });
  }

  connectedCallback() {
    if (this._hass && this._config && !this._built) this._build();
    if (this._resizeObserver && this._el.trigger) {
      this._resizeObserver.observe(this._el.trigger);
    }
  }

  disconnectedCallback() {
    clearTimeout(this._holdTimer);
    clearTimeout(this._keyHoldTimer);
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this._close();
  }
}

customElements.define("mkraftman-samsung-dpad", MkraftmanSamsungDpad);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mkraftman-samsung-dpad",
  name: "Mkraftman Samsung D-pad",
  description: "Mini d-pad overlay for Samsung TVs via remote.send_command.",
});
