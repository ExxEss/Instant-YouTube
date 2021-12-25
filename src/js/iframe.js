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
  } catch (e) {
    console.log(e);
  }
}).observe(document, { childList: true, subtree: true });

window.onmessage = (e) => {
  if (e.data.focus === true) video.focus();
};
