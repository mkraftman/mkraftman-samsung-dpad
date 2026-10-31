/**
 * mkraftman-samsung-dpad
 * Mini d-pad for Samsung TVs via remote.send_command.
 * Shows a gamepad icon that drops a 3x3 d-pad overlay down from the top.
 */

const DPAD_KEYS = [
  { key: "home", icon: "mdi:home-outline", command: "KEY_HOME" },
  { key: "up", icon: "mdi:chevron-up", command: "KEY_UP" },
  { key: "close", icon: "mdi:keyboard-close-outline", action: "close", flip: true },
  { key: "left", icon: "mdi:chevron-left", command: "KEY_LEFT" },
  { key: "ok", icon: "mdi:circle-medium", command: "KEY_ENTER" },
  { key: "right", icon: "mdi:chevron-right", command: "KEY_RIGHT" },
  { key: "back", image: "/local/icons/exit.svg", command: "KEY_RETURN" },
  { key: "down", icon: "mdi:chevron-down", command: "KEY_DOWN" },
  { key: "power", icon: "mdi:power", action: "power" },
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
    return {
      entity: "remote.living_room_samsung_tv",
      media_entity: "media_player.living_room_samsung_tv",
    };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("You must specify an 'entity'");
    this._config = {
      icon: "mdi:gamepad",
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
      const attr = k.action ? `data-action="${k.action}"` : `data-command="${k.command}"`;
      const inner = k.image
        ? `<img src="${k.image}" alt="" />`
        : `<ha-icon icon="${k.icon}"${k.flip ? ' class="flip"' : ""}></ha-icon>`;
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
        }
        .trigger:active {
          opacity: 0.6;
        }

        /* Scrim - tap anywhere outside the d-pad to close */
        .dpad-scrim {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9998;
          background: transparent;
        }
        .dpad-scrim.visible {
          display: block;
        }

        /* D-pad overlay - drops down from the top */
        .dpad-overlay {
          display: none;
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
        .dpad-overlay.visible {
          display: block;
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
        .dpad-key img {
          width: 30px;
          height: 30px;
          pointer-events: none;
          filter: brightness(0) invert(11%);
        }
      </style>

      <button class="trigger" id="trigger" aria-label="D-pad">
        <ha-icon icon="${c.icon}" id="triggerIcon"></ha-icon>
      </button>

      <div class="dpad-scrim" id="scrim"></div>
      <div class="dpad-overlay" id="overlay">
        <div class="dpad-grid">${keysHtml}</div>
      </div>
    `;

    const s = this.shadowRoot;
    this._el.trigger = s.getElementById("trigger");
    this._el.triggerIcon = s.getElementById("triggerIcon");
    this._el.overlay = s.getElementById("overlay");
    this._el.scrim = s.getElementById("scrim");

    this._el.trigger.addEventListener("click", () => this._open());
    this._el.scrim.addEventListener("click", () => this._close());

    this._el.overlay.addEventListener("click", (e) => {
      const key = e.target.closest(".dpad-key");
      if (!key) return;
      const command = key.dataset.command;
      const action = key.dataset.action;
      if (command) {
        this._sendCommand(command);
      } else if (action === "power") {
        this._togglePower();
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
    this._el.overlay.classList.add("visible");
    this._el.scrim.classList.add("visible");
  }

  _close() {
    if (!this._el.overlay) return;
    this._el.overlay.classList.remove("visible");
    this._el.scrim.classList.remove("visible");
  }

  _sendCommand(command) {
    if (!this._hass || !this._config) return;
    this._hass.callService("remote", "send_command", {
      entity_id: this._config.entity,
      command: command,
    });
  }

  _togglePower() {
    if (!this._hass || !this._config) return;
    const mediaEntity = this._config.media_entity;
    if (mediaEntity) {
      const state = this._hass.states[mediaEntity]?.state;
      this._hass.callService("media_player", state === "on" ? "turn_off" : "turn_on", {
        entity_id: mediaEntity,
      });
    } else {
      this._sendCommand("KEY_POWER");
    }
  }

  connectedCallback() {
    if (this._hass && this._config && !this._built) this._build();
    if (this._resizeObserver && this._el.trigger) {
      this._resizeObserver.observe(this._el.trigger);
    }
  }

  disconnectedCallback() {
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
