interface RepeatOSConfig {
  token: string;
  businessName?: string;
  rewardLabel?: string;
  rewardVisits?: number;
  apiBaseUrl?: string;
  primaryColor?: string;
  mode?: "modal" | "inline";
  triggerLabel?: string;
}

declare global {
  interface Window {
    REPEATOS_CONFIG?: RepeatOSConfig;
  }
}

type WidgetState = "idle" | "loading" | "success" | "error";

type ScanResponse = {
  visit_count: number;
  points_balance: number;
  reward:
    | {
        label: string;
        code: string;
        value_kobo: number;
        expires_at: string;
      }
    | null;
};

type ErrorResponse = {
  code: string;
  message: string;
};

const DEFAULT_API_BASE = "https://api.repeatos.co";
const DEFAULT_COLOR = "#ff5722";
const DEFAULT_REWARD_VISITS = 5;

function injectStyles(primaryColor: string): void {
  if (document.getElementById("repeatos-widget-styles")) return;

  const style = document.createElement("style");
  style.id = "repeatos-widget-styles";
  style.textContent = `
    /* ── Floating trigger button ── */
    .ros-trigger {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999998;
      background: ${primaryColor};
      color: #fff;
      border: none;
      border-radius: 56px;
      padding: 14px 22px;
      font-size: 15px;
      font-weight: 600;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18), 0 0 0 0 ${primaryColor}44;
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ros-trigger:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 28px rgba(0,0,0,0.22);
    }
    .ros-trigger:active { transform: translateY(0); }
    .ros-trigger-icon {
      width: 20px;
      height: 20px;
    }

    /* ── Backdrop ── */
    .ros-backdrop {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(0,0,0,0);
      transition: background 0.3s ease;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      pointer-events: none;
    }
    .ros-backdrop--visible {
      background: rgba(0,0,0,0.4);
      pointer-events: auto;
    }
    @media (min-width: 480px) {
      .ros-backdrop {
        align-items: center;
      }
    }

    /* ── Modal dialog ── */
    .ros-modal {
      background: #fff;
      border-radius: 24px 24px 0 0;
      width: 100%;
      max-width: 400px;
      padding: 0;
      box-shadow: 0 -4px 40px rgba(0,0,0,0.12);
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }
    .ros-modal--open {
      transform: translateY(0);
    }
    @media (min-width: 480px) {
      .ros-modal {
        border-radius: 24px;
        transform: translateY(40px) scale(0.95);
        opacity: 0;
        transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
        box-shadow: 0 16px 48px rgba(0,0,0,0.16);
      }
      .ros-modal--open {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }

    /* ── Modal handle (mobile) ── */
    .ros-handle {
      width: 36px;
      height: 4px;
      background: #ddd;
      border-radius: 2px;
      margin: 10px auto 0;
    }
    @media (min-width: 480px) {
      .ros-handle { display: none; }
    }

    /* ── Close button ── */
    .ros-close {
      position: absolute;
      top: 14px;
      right: 16px;
      width: 32px;
      height: 32px;
      border: none;
      background: #f5f5f5;
      border-radius: 50%;
      font-size: 18px;
      color: #666;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .ros-close:hover { background: #eee; }

    /* ── Inner content ── */
    .ros-body {
      padding: 28px 24px 32px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a1a1a;
    }
    .ros-title {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 700;
      text-align: center;
      padding-right: 24px;
    }
    .ros-subtitle {
      margin: 0 0 24px;
      font-size: 14px;
      color: #888;
      text-align: center;
    }
    .ros-input {
      width: 100%;
      padding: 14px 16px;
      margin-bottom: 16px;
      border: 2px solid #eee;
      border-radius: 14px;
      font-size: 16px;
      box-sizing: border-box;
      transition: border-color 0.2s;
      outline: none;
      font-family: inherit;
      -webkit-appearance: none;
    }
    .ros-input:focus { border-color: ${primaryColor}; }
    .ros-btn {
      width: 100%;
      padding: 14px;
      background: ${primaryColor};
      color: #fff;
      border: none;
      border-radius: 14px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
      font-family: inherit;
    }
    .ros-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .ros-btn:active { transform: translateY(0); }
    .ros-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .ros-btn-secondary {
      background: #f3f3f3;
      color: #333;
    }
    .ros-dots {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin: 20px 0 8px;
      flex-wrap: wrap;
    }
    .ros-dot {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: #f0f0f0;
      transition: background 0.3s, transform 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      color: #bbb;
      font-weight: 700;
    }
    .ros-dot--filled {
      background: ${primaryColor};
      color: #fff;
      transform: scale(1.08);
    }
    .ros-bar-track {
      width: 100%;
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      margin: 16px 0 8px;
      overflow: hidden;
    }
    .ros-bar-fill {
      height: 100%;
      background: ${primaryColor};
      border-radius: 4px;
      transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
    }
    .ros-progress-text {
      font-size: 13px;
      color: #888;
      text-align: center;
      margin: 0 0 20px;
    }
    .ros-reward-banner {
      background: linear-gradient(135deg, #28a745, #218838);
      color: #fff;
      padding: 18px;
      border-radius: 16px;
      text-align: center;
      margin: 16px 0;
      animation: rosPulse 0.6s ease-out;
    }
    .ros-reward-banner small {
      display: block;
      font-size: 11px;
      opacity: 0.85;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }
    .ros-reward-banner strong { font-size: 18px; }
    .ros-confetti-emoji {
      font-size: 28px;
      display: block;
      margin-bottom: 6px;
    }
    .ros-error {
      background: #fff5f5;
      border: 1px solid #fee;
      color: #c53030;
      padding: 12px;
      border-radius: 12px;
      font-size: 14px;
      text-align: center;
      margin-bottom: 16px;
    }
    .ros-success-header {
      text-align: center;
      margin-bottom: 4px;
    }
    .ros-success-header .ros-check {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${primaryColor}15;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .ros-success-header .ros-check svg {
      width: 24px;
      height: 24px;
      stroke: ${primaryColor};
    }
    .ros-branding {
      text-align: center;
      font-size: 11px;
      color: #ccc;
      margin-top: 20px;
    }
    .ros-branding a { color: #aaa; text-decoration: none; }

    @keyframes rosPulse {
      0% { transform: scale(0.9); opacity: 0; }
      60% { transform: scale(1.02); }
      100% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const GIFT_SVG = `<svg viewBox="0 0 20 20" fill="currentColor" class="ros-trigger-icon"><path d="M10 2a2 2 0 00-2 2H5a2 2 0 00-2 2v1h14V6a2 2 0 00-2-2h-3a2 2 0 00-2-2z"/><path fill-rule="evenodd" d="M3 9v7a2 2 0 002 2h10a2 2 0 002-2V9H3zm5 1a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1zm4 0a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z" clip-rule="evenodd"/></svg>`;

function getErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case "COOLDOWN_ACTIVE":
      return "You checked in too recently. Please wait a moment.";
    case "INVALID_TOKEN":
    case "TOKEN_INACTIVE":
      return "This QR code is no longer valid.";
    case "ORIGIN_NOT_ALLOWED":
      return "This check-in page is not authorized.";
    case "INVALID_PAYLOAD":
      return "Please enter a valid phone number.";
    default:
      return fallback || "Something went wrong. Please try again.";
  }
}

function initWidget(): void {
  const cfg = window.REPEATOS_CONFIG;
  if (!cfg || !cfg.token) {
    console.error("RepeatOS: Missing token in REPEATOS_CONFIG.");
    return;
  }

  const apiBase = (cfg.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/$/, "");
  const color = cfg.primaryColor ?? DEFAULT_COLOR;
  const businessName = cfg.businessName ?? "Check In";
  const rewardVisits = cfg.rewardVisits ?? DEFAULT_REWARD_VISITS;
  const rewardLabel = cfg.rewardLabel ?? "Reward";
  const mode = cfg.mode ?? "modal";
  const triggerLabel = cfg.triggerLabel ?? "Check In";

  injectStyles(color);

  let state: WidgetState = "idle";
  let lastResult: ScanResponse | null = null;
  let lastError = "";
  let isOpen = mode === "inline";

  let backdropEl: HTMLDivElement | null = null;
  let modalEl: HTMLDivElement | null = null;
  let triggerEl: HTMLButtonElement | null = null;
  let bodyEl: HTMLDivElement | null = null;

  function open(): void {
    isOpen = true;
    if (backdropEl) backdropEl.classList.add("ros-backdrop--visible");
    if (modalEl) modalEl.classList.add("ros-modal--open");
    if (triggerEl) triggerEl.style.display = "none";
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      const phoneInput = document.getElementById("ros-phone") as HTMLInputElement | null;
      phoneInput?.focus();
    }, 350);
  }

  function close(): void {
    isOpen = false;
    state = "idle";
    lastResult = null;
    lastError = "";
    if (modalEl) modalEl.classList.remove("ros-modal--open");
    if (backdropEl) backdropEl.classList.remove("ros-backdrop--visible");
    document.body.style.overflow = "";
    setTimeout(() => {
      if (triggerEl) triggerEl.style.display = "flex";
      render();
    }, 350);
  }

  function buildShell(): void {
    if (mode === "inline") {
      const inlineContainer = document.getElementById("repeatos-widget");
      if (!inlineContainer) {
        console.error("RepeatOS: #repeatos-widget container not found.");
        return;
      }
      bodyEl = inlineContainer as HTMLDivElement;
      return;
    }

    triggerEl = document.createElement("button");
    triggerEl.className = "ros-trigger";
    triggerEl.innerHTML = `${GIFT_SVG} ${triggerLabel}`;
    triggerEl.addEventListener("click", () => {
      render();
      open();
    });
    document.body.appendChild(triggerEl);

    backdropEl = document.createElement("div");
    backdropEl.className = "ros-backdrop";
    backdropEl.addEventListener("click", (e) => {
      if (e.target === backdropEl) close();
    });

    modalEl = document.createElement("div");
    modalEl.className = "ros-modal";
    modalEl.setAttribute("role", "dialog");
    modalEl.setAttribute("aria-modal", "true");
    modalEl.setAttribute("aria-label", `${businessName} check-in`);
    modalEl.innerHTML = `
      <div class="ros-handle"></div>
      <button class="ros-close" aria-label="Close">&times;</button>
      <div class="ros-body"></div>
    `;

    modalEl.querySelector(".ros-close")!.addEventListener("click", close);

    bodyEl = modalEl.querySelector(".ros-body") as HTMLDivElement;
    backdropEl.appendChild(modalEl);
    document.body.appendChild(backdropEl);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) close();
    });
  }

  function render(): void {
    if (!bodyEl) return;
    switch (state) {
      case "idle":
        renderIdle();
        break;
      case "loading":
        renderLoading();
        break;
      case "success":
        renderSuccess();
        break;
      case "error":
        renderError();
        break;
    }
  }

  function renderIdle(): void {
    bodyEl!.innerHTML = `
      <h3 class="ros-title">${businessName}</h3>
      <p class="ros-subtitle">Enter your phone to check in</p>
      <input type="tel" id="ros-phone" class="ros-input"
        placeholder="+234 xxx xxx xxxx" autocomplete="tel" inputmode="tel">
      <button id="ros-submit" class="ros-btn">Check In</button>
      <p class="ros-branding"><a href="#">Powered by RepeatOS</a></p>
    `;

    const phoneInput = document.getElementById("ros-phone") as HTMLInputElement;
    const submitBtn = document.getElementById("ros-submit") as HTMLButtonElement;

    phoneInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitBtn.click();
    });

    submitBtn.addEventListener("click", () => {
      const phone = phoneInput.value.trim();
      if (phone.length < 7) {
        lastError = "Please enter a valid phone number.";
        state = "error";
        render();
        return;
      }
      doCheckin(phone);
    });
  }

  function renderLoading(): void {
    bodyEl!.innerHTML = `
      <h3 class="ros-title">${businessName}</h3>
      <p class="ros-subtitle">Checking in...</p>
      <button class="ros-btn" disabled>Checking in...</button>
    `;
  }

  function renderSuccess(): void {
    if (!lastResult) return;

    const { visit_count, reward, points_balance } = lastResult;
    const pct = Math.min((visit_count / rewardVisits) * 100, 100);
    const remaining = Math.max(rewardVisits - visit_count, 0);
    const pointsNaira = Math.max(Math.floor(points_balance / 100), 0);
    const pointsText = `₦${pointsNaira.toLocaleString("en-NG")}`;

    let dotsHtml = "";
    for (let i = 1; i <= rewardVisits; i++) {
      const filled = i <= visit_count ? " ros-dot--filled" : "";
      dotsHtml += `<div class="ros-dot${filled}">${i <= visit_count ? "&#10003;" : i}</div>`;
    }

    const rewardBanner = reward
      ? `<div class="ros-reward-banner">
          <span class="ros-confetti-emoji">🎉</span>
          <small>Voucher Unlocked</small>
          <strong>${reward.label}</strong>
          <div style="margin-top:10px; font-size:13px; font-weight:600;">
            Code: ${reward.code}
          </div>
          <small>Expires ${new Date(reward.expires_at).toLocaleDateString(
            "en-GB",
          )}</small>
        </div>`
      : "";

    const progressText =
      remaining > 0
        ? `${remaining} more visit${remaining !== 1 ? "s" : ""} until your ${rewardLabel}`
        : "";

    bodyEl!.innerHTML = `
      <div class="ros-success-header">
        <div class="ros-check">${CHECK_SVG}</div>
        <h3 class="ros-title">Visit #${visit_count}</h3>
        <p class="ros-subtitle" style="margin-top:6px;">Points: ${pointsText}</p>
      </div>
      ${rewardBanner}
      <div class="ros-dots">${dotsHtml}</div>
      <div class="ros-bar-track"><div class="ros-bar-fill" style="width:${pct}%"></div></div>
      ${progressText ? `<p class="ros-progress-text">${progressText}</p>` : ""}
      <button id="ros-done" class="ros-btn ros-btn-secondary">Done</button>
      <p class="ros-branding"><a href="#">Powered by RepeatOS</a></p>
    `;

    document.getElementById("ros-done")!.addEventListener("click", () => {
      if (mode === "modal") {
        close();
      } else {
        state = "idle";
        lastResult = null;
        render();
      }
    });
  }

  function renderError(): void {
    bodyEl!.innerHTML = `
      <h3 class="ros-title">${businessName}</h3>
      <div class="ros-error">${lastError}</div>
      <button id="ros-retry" class="ros-btn">Try Again</button>
      <p class="ros-branding"><a href="#">Powered by RepeatOS</a></p>
    `;

    document.getElementById("ros-retry")!.addEventListener("click", () => {
      state = "idle";
      lastError = "";
      render();
    });
  }

  async function doCheckin(phone: string): Promise<void> {
    state = "loading";
    render();

    try {
      const res = await fetch(`${apiBase}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cfg!.token, phone }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Partial<ErrorResponse>;
        lastError = getErrorMessage(body.code ?? "", body.message ?? "");
        state = "error";
        render();
        return;
      }

      lastResult = (await res.json()) as ScanResponse;
      state = "success";
      render();
    } catch {
      lastError = "Network error. Please check your connection and try again.";
      state = "error";
      render();
    }
  }

  buildShell();
  if (mode === "inline") render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWidget);
} else {
  initWidget();
}
