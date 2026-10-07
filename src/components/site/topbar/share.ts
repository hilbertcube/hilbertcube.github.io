/**
 * share.ts
 * ========
 * The top bar's share panel: the page's link with a Copy button, and one
 * button per platform opening that platform's share URL in a new tab.
 */

import { initPanel } from "./panel";

const SHARE_URLS: Record<string, (url: string, title: string) => string> = {
  facebook: (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  twitter: (url) =>
    `https://twitter.com/intent/tweet?url=${url}&text=Check%20this%20out!`,
  whatsapp: (url) => `https://api.whatsapp.com/send?text=${url}`,
  reddit: (url) =>
    `https://www.reddit.com/submit?url=${url}&title=Interesting%20page`,
  hackernews: (url, title) =>
    `https://news.ycombinator.com/submitlink?u=${url}&t=${title}`,
  telegram: (url, title) => `https://t.me/share/url?url=${url}&text=${title}`,
};

export function initShare() {
  const panel = initPanel("shareBtn", "sharePanel");
  if (!panel) return;

  const url = document.getElementById("shareUrl");
  if (url) url.textContent = location.host + location.pathname;

  const copy = document.getElementById("shareCopy");
  const copyLabel = document.getElementById("shareCopyLabel");
  let resetLabel: ReturnType<typeof setTimeout> | undefined;
  copy?.addEventListener("click", async () => {
    if (!copyLabel) return;
    try {
      await navigator.clipboard.writeText(location.href);
      copyLabel.textContent = "Copied";
    } catch {
      copyLabel.textContent = "Failed";
    }
    clearTimeout(resetLabel);
    resetLabel = setTimeout(() => (copyLabel.textContent = "Copy"), 1500);
  });

  document
    .querySelectorAll<HTMLElement>("#sharePanel .share-option")
    .forEach((option) => {
      option.addEventListener("click", () => {
        const build = SHARE_URLS[option.dataset.share ?? ""];
        if (!build) return;
        window.open(
          build(
            encodeURIComponent(location.href),
            encodeURIComponent(document.title),
          ),
          "_blank",
        );
        panel.close();
      });
    });
}
