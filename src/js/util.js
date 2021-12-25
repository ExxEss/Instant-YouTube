const Util = {
  isVideoPlaying: (video) => {
    return (
      video !== null &&
      video.currentTime > 0 &&
      !video.paused &&
      !video.ended &&
      video.readyState > 2
    );
  },

  isSelectable: (element) => {
    let unselectableTypes;
    if (!(element instanceof Element)) {
      return false;
    }

    unselectableTypes = [
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "reset",
      "submit",
    ];
    return (
      (element.nodeName.toLowerCase() === "input" &&
        unselectableTypes.indexOf(element.type) === -1) ||
      element.nodeName.toLowerCase() === "textarea" ||
      element.isContentEditable
    );
  },
};

export default Util;
