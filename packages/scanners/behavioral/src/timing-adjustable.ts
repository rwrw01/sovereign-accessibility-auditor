import type { Page } from "playwright";
import type { BehavioralFinding, BehavioralTestResult } from "@saa/shared";

// ── Timing Adjustable / Pause Stop Hide (WCAG 2.2.1, 2.2.2) ──

export async function runTimingAdjustableTest(page: Page): Promise<BehavioralTestResult> {
  const start = performance.now();
  const findings: BehavioralFinding[] = [];

  try {
    // ── 2.2.1: <meta http-equiv="refresh"> with non-zero timeout
    const metaRefresh = await page.evaluate(() => {
      const meta = document.querySelector("meta[http-equiv='refresh' i]") as HTMLMetaElement | null;
      if (!meta) return null;
      const content = meta.getAttribute("content") ?? "";
      const match = /^(\d+)/.exec(content.trim());
      return { content, seconds: match ? parseInt(match[1] ?? "0", 10) : 0 };
    });

    if (metaRefresh && metaRefresh.seconds > 0) {
      findings.push({
        test: "timing-adjustable", type: "error",
        wcagCriteria: ["2.2.1"], wcagLevel: "A",
        selector: "meta[http-equiv='refresh']",
        context: `content="${metaRefresh.content}", timeout=${metaRefresh.seconds}s`,
        message: `<meta http-equiv="refresh"> causes a ${metaRefresh.seconds}s automatic redirect — time limits must be adjustable, extendable, or removable (WCAG 2.2.1)`,
        impact: "serious",
      });
    }

    // 2.2.1: Session-timeout / countdown indicators in the DOM
    const sessionIndicators = await page.evaluate(() => {
      const kw = /session|timeout|time.?out|expires|verloopt|verlopen|sessie|countdown/i;
      const results: Array<{ sel: string; text: string; role: string | null }> = [];
      const candidates = document.querySelectorAll(
        "[role='timer'], [role='alert'], [aria-live], .session-timeout, .countdown, #countdown, #timer, #session-timer"
      );
      for (const el of candidates) {
        const h = el as HTMLElement;
        const r = h.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const text = h.textContent?.trim().slice(0, 120) ?? "";
        if (!kw.test(text) && !kw.test(h.className)) continue;
        const id = h.id ? `#${h.id}` : "";
        const cls = h.className && typeof h.className === "string"
          ? "." + h.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        results.push({ sel: id || h.tagName.toLowerCase() + cls, text: text.slice(0, 80), role: h.getAttribute("role") });
      }
      return results;
    });

    for (const ind of sessionIndicators) {
      findings.push({
        test: "timing-adjustable", type: "warning",
        wcagCriteria: ["2.2.1"], wcagLevel: "A",
        selector: ind.sel,
        context: `text="${ind.text}", role="${ind.role ?? "none"}"`,
        message: `Session timeout indicator detected — verify users can turn off, adjust, or extend any time limit before it expires (WCAG 2.2.1)`,
        impact: "serious",
      });
    }

    // 2.2.1: Monitor URL for automatic redirect within 5 seconds
    const urlBefore = page.url();
    await page.waitForTimeout(5000);
    if (page.url() !== urlBefore) {
      findings.push({
        test: "timing-adjustable", type: "error",
        wcagCriteria: ["2.2.1"], wcagLevel: "A",
        selector: "body",
        context: `URL changed from "${urlBefore}" to "${page.url()}" without user interaction`,
        message: `Page automatically navigated within 5 seconds — automatic time-based redirects must be adjustable or avoidable (WCAG 2.2.1)`,
        impact: "critical",
      });
    }

    // ── 2.2.2: Auto-playing media without controls
    const autoplayMedia = await page.evaluate(() => {
      const issues: Array<{ sel: string; tag: string; hasControls: boolean }> = [];
      for (const el of document.querySelectorAll("video[autoplay], audio[autoplay]")) {
        const m = el as HTMLMediaElement;
        const r = m.getBoundingClientRect();
        if (r.width === 0 && m.tagName.toLowerCase() !== "audio") continue;
        const id = m.id ? `#${m.id}` : "";
        const cls = m.className && typeof m.className === "string"
          ? "." + m.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        issues.push({ sel: id || m.tagName.toLowerCase() + cls, tag: m.tagName.toLowerCase(), hasControls: m.hasAttribute("controls") });
      }
      return issues;
    });

    for (const media of autoplayMedia) {
      findings.push({
        test: "timing-adjustable",
        type: media.hasControls ? "warning" : "error",
        wcagCriteria: ["2.2.2"], wcagLevel: "A",
        selector: media.sel,
        context: media.hasControls ? "autoplay with controls present" : "autoplay without controls",
        message: media.hasControls
          ? `<${media.tag}> plays automatically — verify users can immediately pause or stop playback (WCAG 2.2.2)`
          : `<${media.tag}> plays automatically without controls — users must be able to pause, stop, or hide moving content (WCAG 2.2.2)`,
        impact: media.hasControls ? "moderate" : "serious",
      });
    }

    // 2.2.2: <marquee> elements
    const marquees = await page.evaluate(() => {
      return [...document.querySelectorAll("marquee")].map((el) => {
        const h = el as HTMLElement;
        const id = h.id ? `#${h.id}` : "";
        const cls = h.className && typeof h.className === "string"
          ? "." + h.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        return { sel: id || "marquee" + cls, text: h.textContent?.trim().slice(0, 60) ?? "" };
      });
    });

    for (const m of marquees) {
      findings.push({
        test: "timing-adjustable", type: "error",
        wcagCriteria: ["2.2.2"], wcagLevel: "A",
        selector: m.sel,
        context: `text="${m.text}"`,
        message: `<marquee> scrolling text cannot be paused or stopped — replace with static text or provide a pause mechanism (WCAG 2.2.2)`,
        impact: "serious",
      });
    }

    // 2.2.2: Infinite CSS animations without a nearby pause/stop control
    const animIssues = await page.evaluate(() => {
      const issues: Array<{ sel: string; tag: string; duration: string; iteration: string }> = [];
      for (const el of document.querySelectorAll("*")) {
        const h = el as HTMLElement;
        const r = h.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const s = window.getComputedStyle(h);
        const name = s.animationName;
        const dur = s.animationDuration;
        const iter = s.animationIterationCount;
        if (!name || name === "none" || !dur || dur === "0s") continue;
        const isInfinite = iter === "infinite";
        const durSec = parseFloat(dur);
        const isLong = !isNaN(durSec) && durSec > 5;
        if (!isInfinite && !isLong) continue;
        const nearbyText = (h.parentElement?.textContent ?? "").toLowerCase();
        if (/pause|stop|pauzeer|stoppen/.test(nearbyText)) continue;
        const id = h.id ? `#${h.id}` : "";
        const cls = h.className && typeof h.className === "string"
          ? "." + h.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
        issues.push({ sel: id || h.tagName.toLowerCase() + cls, tag: h.tagName.toLowerCase(), duration: dur, iteration: iter });
        if (issues.length >= 10) break;
      }
      return issues;
    });

    for (const anim of animIssues) {
      findings.push({
        test: "timing-adjustable", type: "warning",
        wcagCriteria: ["2.2.2"], wcagLevel: "A",
        selector: anim.sel,
        context: `animation-duration=${anim.duration}, animation-iteration-count=${anim.iteration}`,
        message: `<${anim.tag}> has a continuously running CSS animation with no visible pause/stop mechanism nearby — moving content must be pausable (WCAG 2.2.2)`,
        impact: "moderate",
      });
    }

    // 2.2.2: aria-live regions without a nearby pause control (notice)
    const liveRegions = await page.evaluate(() => {
      return [...document.querySelectorAll("[aria-live='polite'], [aria-live='assertive']")]
        .filter((el) => { const r = (el as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0; })
        .filter((el) => !/pause|stop|pauzeer|stoppen/.test(((el as HTMLElement).parentElement?.textContent ?? "").toLowerCase()))
        .map((el) => {
          const h = el as HTMLElement;
          const id = h.id ? `#${h.id}` : "";
          const cls = h.className && typeof h.className === "string"
            ? "." + h.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
          return { sel: id || h.tagName.toLowerCase() + cls, live: h.getAttribute("aria-live") ?? "" };
        });
    });

    for (const region of liveRegions) {
      findings.push({
        test: "timing-adjustable", type: "notice",
        wcagCriteria: ["2.2.2"], wcagLevel: "A",
        selector: region.sel,
        context: `aria-live="${region.live}"`,
        message: `aria-live="${region.live}" region has no visible pause/stop mechanism — if it updates frequently, verify users can pause updates (WCAG 2.2.2)`,
        impact: "minor",
      });
    }

    return { test: "timing-adjustable", findings, durationMs: Math.round(performance.now() - start), error: null };
  } catch (err) {
    return { test: "timing-adjustable", findings, durationMs: Math.round(performance.now() - start), error: err instanceof Error ? err.message : String(err) };
  }
}
