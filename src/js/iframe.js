import Util from "./util";

let video = null,
  neverPlayed = true;

new MutationObserver(() => {
  try {
    if (!video && neverPlayed) {
      video = document.querySelector("video");
      if (video) {
        video.focus();
        video.loop = true;
        neverPlayed = false;
      }
    }
  } catch (error) {
    console.log(error);
  }
}).observe(document, { childList: true, subtree: true });

window.addEventListener(
  "keydown",
  (e) => {
    const activeElement = document.activeElement;
    if (Util.isSelectable(activeElement)) return;
    if (e.key === "Escape") parent.postMessage("removeVideo", "*");
  },
  true
);

window.onmessage = (e) => {
  if (e.data.focus === true) video.focus();
};
