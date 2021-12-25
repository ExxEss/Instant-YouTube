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
        video.autoPictureInPicture = true;
        neverPlayed = false;
      }
    }
  } catch (e) {
    console.log(e);
  }
}).observe(document, { childList: true, subtree: true });

// window.addEventListener("visibilitychange", () => {
//   if (video){
//     if (document.pictureInPictureElement) {
//       video.exitPictureInPicture();
//     } else {
//       video.requestPictureInPicture();
//     }
//   }
// });

window.addEventListener(
  "keydown",
  function (e) {
    const activeElement = document.activeElement;
    if (Util.isSelectable(activeElement)) {
      return;
    }

    if (e.key === "Escape") parent.postMessage("removeVideo", "*");

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.stopImmediatePropagation();
      e.preventDefault();

      if (video !== undefined && video !== null) {
        if (e.key === "ArrowLeft") {
          video.currentTime -= 15;
        } else {
          video.currentTime += 15;
        }
        return;
      }
    }

    if (e.key === " ") {
      if (video !== undefined && video !== null) {
        e.stopImmediatePropagation();
        e.preventDefault();

        if (Util.isVideoPlaying(video)) {
          video.pause();
          video.blur();
        } else {
          video.play();
        }
      }
    }
  },
  true
);

window.onmessage = (e) => {
  if (e.data.focus === true) video.focus();
};
