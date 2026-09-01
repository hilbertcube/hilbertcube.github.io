/**
 * share.ts
 * ========
 * The top bar's share menu: a dropdown of social platforms, each opening that
 * platform's share URL for the current page in a new tab.
 */

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
  const button = document.getElementById("shareBtn");
  const dropdown = document.getElementById("shareDropdown");
  if (!button || !dropdown) return;

  let open = false;

  const setOpen = (next: boolean) => {
    open = next;
    button.classList.toggle("active", open);
    dropdown.classList.toggle("open", open);
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    setOpen(!open);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) setOpen(false);
  });

  // Close on a click outside the button/dropdown. Guarded by `open` so it's a
  // no-op when already closed.
  document.addEventListener("click", (event) => {
    if (!open) return;
    const target = event.target as Node;
    if (!target.isConnected) return;
    if (button.contains(target) || dropdown.contains(target)) return;
    setOpen(false);
  });

  dropdown.querySelectorAll<HTMLElement>(".share-option").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      const build = SHARE_URLS[option.dataset.share ?? ""];
      if (!build) return;
      window.open(
        build(
          encodeURIComponent(window.location.href),
          encodeURIComponent(document.title),
        ),
        "_blank",
      );
      setOpen(false);
    });
  });
}
