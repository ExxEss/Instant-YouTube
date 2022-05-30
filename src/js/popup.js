const port = chrome.runtime.connect({
  name: "popup"
});

const PREFERENCES_KEY = 'Instant_YouTube_Preferences';

let preferences;
chrome.storage.local.get([PREFERENCES_KEY],
  obj => {
    preferences = obj[PREFERENCES_KEY] || {};
    let elem = document.getElementById('watchNumber');
    elem.value = preferences.maxVideo || elem.value;

    // if (!preferences.closeDotPosition ||
    //   preferences.closeDotPosition === 'left') {
    //   document.getElementById('left').checked = 'checked';
    // } else if (preferences.closeDotPosition === 'right') {
    //   document.getElementById('right').checked = 'checked';
    // }
  });

const createUpdateListeners = (() => {
  [
    document.getElementById('watchNumber')
    // , document.getElementById('left'),
    // document.getElementById('right')
  ].forEach((elem, index) => {
    elem.onchange = () => {
      port.postMessage({
        type: index,
        value: elem.value
      });

      if (index === 0)
        preferences.maxVideo = elem.value;
      // else
      //   preferences.closeDotPosition = elem.value;

      chrome.storage.local.set({
        [PREFERENCES_KEY]: preferences
      });
    }
  });
})();