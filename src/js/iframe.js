(() => {
  let browser = require('webextension-polyfill');

  let video = null,
    neverPlayed = true;

  let isVideoPlaying = function (video) {
    return video !== null && video.currentTime > 0 && !video.paused &&
      !video.ended && video.readyState > 2;
  };

  let isSelectable = function (element) {
    var unselectableTypes;
    if (!(element instanceof Element)) {
      return false;
    }

    unselectableTypes = ['button', 'checkbox', 'color',
      'file', 'hidden', 'image', 'radio', 'reset', 'submit'];
    return (element.nodeName.toLowerCase() === 'input' &&
      unselectableTypes.indexOf(element.type) === -1) ||
      element.nodeName.toLowerCase() === 'textarea' ||
      element.isContentEditable;
  }

  // setInterval(() => {
  //   video.requestPictureInPicture();
  // }, 1000);

  new MutationObserver(() => {
    try {
      if (!video && neverPlayed) {
        video = document.querySelector('video');
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

  // window.setInterval(() => {
  //   document.querySelector('video').requestPictureInPicture();
  //   // if (document.pictureInPictureElement) {
  //   //   video.exitPictureInPicture();
  //   // } else {
  //   //   video.requestPictureInPicture();
  //   // }
  // }, 1000);

  window.addEventListener('keydown', function (e) {
    const activeElement = document.activeElement;
    if (isSelectable(activeElement)) {
      return;
    }

    if (e.key === 'Escape')
      parent.postMessage('removeVideo', '*');

    if (e.key === ' ') {
      if (video !== undefined && video !== null) {
        e.stopImmediatePropagation();
        e.preventDefault();

        if (isVideoPlaying(video)) {
          video.pause();
          video.blur();
        } else {
          video.play();
        }
      }
    }
  }, true);

  window.onmessage = (e) => {
    if (e.data.focus === true) video.focus();
  };
})();