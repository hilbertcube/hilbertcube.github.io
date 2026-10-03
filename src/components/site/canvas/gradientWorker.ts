/**
 * gradientWorker.ts
 * =================
 * Draws the homepage banner's field (gradientField.ts) on an OffscreenCanvas
 * handed over by gradientCanvas.ts, so none of the per-frame work happens on
 * the main thread. Messages in:
 *
 *   { type: "init", canvas }      the transferred OffscreenCanvas
 *   { type: "resize", size }      a FieldSize, live or settled (see gradientCanvas.ts)
 *   { type: "state", state }      a RunState: visible / reduced motion
 */
import { CONTEXT_OPTIONS, createRenderer, type FieldSize, type RunState } from "./gradientField";

type Message =
  | { type: "init"; canvas: OffscreenCanvas }
  | { type: "resize"; size: FieldSize }
  | { type: "state"; state: RunState };

let renderer: ReturnType<typeof createRenderer> | null = null;

addEventListener("message", (event: MessageEvent<Message>) => {
  const message = event.data;
  if (message.type === "init") {
    const ctx = message.canvas.getContext("2d", CONTEXT_OPTIONS);
    if (ctx) renderer = createRenderer(message.canvas, ctx);
  } else if (message.type === "resize") {
    renderer?.resize(message.size);
  } else {
    renderer?.setState(message.state);
  }
});
