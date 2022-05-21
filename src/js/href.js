import Browser from 'webextension-polyfill';

let previousHref;

const youtubeUrlPattern =
  /www.youtube.com\/(watch|embed)+/;

setInterval(() => {
  if (
    previousHref !== document.location.href &&
    youtubeUrlPattern.test(document.location.href)) {
    previousHref = document.location.href;
    Browser.runtime.sendMessage({
      type: 'addHistory',
      url: document.location.href,
    });
  }
}, 1000);