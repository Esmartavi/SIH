/**
 * BHARAT-DRISHTI // UI Components
 * StatsCounter Component
 * 
 * High-performance smooth counter animation for numbers, currencies, percentages, and metrics.
 * Supports:
 * - Function call: StatsCounter(el, { value: 12000, suffix: "+", duration: 2 })
 * - Web Component: <stats-counter value="12000" suffix="+" duration="2"></stats-counter>
 * - Auto-init via data attributes: data-stats-counter data-value="12000" data-suffix="+"
 */

export class StatsCounter {
  constructor(element, options = {}) {
    this.element = typeof element === "string" ? document.querySelector(element) : element;
    if (!this.element) return;

    // Detect if options is just a number or string
    if (typeof options === "number" || typeof options === "string") {
      options = { value: options };
    }

    // Auto-parse existing text in element if value is not provided
    let parsedInitial = { num: 0, prefix: "", suffix: "", decimals: 0 };
    if (this.element.textContent && options.value === undefined) {
      parsedInitial = StatsCounter.parse(this.element.textContent);
      options.value = parsedInitial.num;
    }

    // Parse target value if it's a formatted string (e.g. "₹9.8 Cr", "88.4%", "12,000+")
    let parsedTarget = { num: 0, prefix: "", suffix: "", decimals: 0 };
    if (typeof options.value === "string") {
      parsedTarget = StatsCounter.parse(options.value);
    } else {
      parsedTarget.num = Number(options.value) || 0;
    }

    this.options = {
      value: parsedTarget.num,
      startValue: options.startValue !== undefined ? Number(options.startValue) : null,
      prefix: options.prefix !== undefined ? options.prefix : (parsedTarget.prefix || parsedInitial.prefix || ""),
      suffix: options.suffix !== undefined ? options.suffix : (parsedTarget.suffix || parsedInitial.suffix || ""),
      duration: options.duration !== undefined ? Number(options.duration) : 1.8, // in seconds
      decimals: options.decimals !== undefined ? options.decimals : (parsedTarget.decimals || 0),
      useCommas: options.useCommas !== undefined ? options.useCommas : true,
      scrollTrigger: options.scrollTrigger !== undefined ? options.scrollTrigger : true,
      threshold: options.threshold !== undefined ? options.threshold : 0.1,
      easing: options.easing || "easeOutExpo",
      onComplete: options.onComplete || null
    };

    if (this.options.scrollTrigger && typeof IntersectionObserver !== "undefined") {
      let initialVal = this.options.startValue !== null ? this.options.startValue : 0;
      if (!this.element.textContent || this.element.textContent.trim() === "" || this.element.textContent.trim() === "–") {
        this.element.textContent = this.format(initialVal);
      }

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (this.observer) {
              this.observer.disconnect();
              this.observer = null;
            }
            this.start();
          }
        });
      }, {
        threshold: this.options.threshold,
        rootMargin: "0px 0px -20px 0px"
      });
      this.observer.observe(this.element);
    } else {
      this.start();
    }
  }

  static parse(valStr) {
    if (typeof valStr === "number") return { num: valStr, prefix: "", suffix: "", decimals: 0 };
    valStr = String(valStr).trim();
    const match = valStr.match(/^([^\d\-+.]*?)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!match) return { num: 0, prefix: "", suffix: valStr, decimals: 0 };
    
    const prefix = match[1];
    const numStr = match[2].replace(/,/g, "");
    const suffix = match[3];
    const decimals = match[2].includes(".") ? match[2].split(".")[1].length : 0;
    return {
      num: parseFloat(numStr) || 0,
      prefix,
      suffix,
      decimals
    };
  }

  static animate(element, options = {}) {
    return new StatsCounter(element, options);
  }

  start() {
    const el = this.element;
    if (!el) return;

    // Determine starting number
    let startNum = this.options.startValue;
    if (startNum === null) {
      const currentParsed = StatsCounter.parse(el.textContent);
      startNum = isNaN(currentParsed.num) ? 0 : currentParsed.num;
    }

    const targetNum = this.options.value;
    const durationMs = Math.max(100, this.options.duration * 1000);

    // If already at target value, set and exit
    if (startNum === targetNum) {
      el.textContent = this.format(targetNum);
      return;
    }

    el.classList.add("stats-counter-active");
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, elapsed / durationMs);

      // Ultra-smooth Exponential Ease-Out (approaches target gracefully)
      const ease = rawProgress === 1 ? 1 : 1 - Math.pow(2, -10 * rawProgress);
      const currentVal = startNum + (targetNum - startNum) * ease;

      el.textContent = this.format(currentVal);

      if (rawProgress < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        el.textContent = this.format(targetNum);
        el.classList.remove("stats-counter-active");
        if (typeof this.options.onComplete === "function") {
          this.options.onComplete();
        }
      }
    };

    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(tick);
  }

  format(num) {
    let formatted;
    if (this.options.decimals > 0) {
      formatted = num.toFixed(this.options.decimals);
    } else {
      formatted = Math.round(num).toString();
    }

    if (this.options.useCommas) {
      const parts = formatted.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      formatted = parts.join(".");
    }

    return `${this.options.prefix}${formatted}${this.options.suffix}`;
  }
}

/**
 * Web Component <stats-counter>
 * Usage in HTML:
 * <stats-counter value="12000" suffix="+" duration="2"></stats-counter>
 */
if (typeof customElements !== "undefined" && !customElements.get("stats-counter")) {
  class StatsCounterElement extends HTMLElement {
    static get observedAttributes() {
      return ["value", "prefix", "suffix", "duration", "decimals", "use-commas"];
    }

    connectedCallback() {
      this.classList.add("stats-counter");
      this.updateCounter();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal !== newVal) {
        this.updateCounter();
      }
    }

    updateCounter() {
      const valAttr = this.getAttribute("value");
      if (valAttr === null) return;

      const duration = parseFloat(this.getAttribute("duration")) || 1.8;
      const prefix = this.getAttribute("prefix") || "";
      const suffix = this.getAttribute("suffix") || "";
      const decimalsAttr = this.getAttribute("decimals");
      const decimals = decimalsAttr !== null ? parseInt(decimalsAttr, 10) : undefined;
      const useCommas = this.getAttribute("use-commas") !== "false";

      StatsCounter.animate(this, {
        value: valAttr,
        duration,
        prefix,
        suffix,
        decimals,
        useCommas
      });
    }
  }

  customElements.define("stats-counter", StatsCounterElement);
}

// Attach globally for non-module scripts
if (typeof window !== "undefined") {
  window.StatsCounter = StatsCounter;
}

export default StatsCounter;
