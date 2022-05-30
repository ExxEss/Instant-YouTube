import Browser from 'webextension-polyfill';

const youtubeUrlPrefix =
  'https://www.youtube.com/watch?v=';

let previousHref;

const youtubeUrlPattern =
  /www.youtube.com\/(watch)+/;

const extractVideoId = (url) => {
  const index = url.indexOf('v=') + 2;
  let id = '';
  for (let i = index; i < url.length; i++) {
    if (url[i] === '&') return id;
    id += url[i];
  }
  return id;
}

setInterval(() => {
  if (
    previousHref !== document.location.href &&
    youtubeUrlPattern.test(document.location.href)
  ) {
    previousHref = document.location.href;
    Browser.runtime.sendMessage({
      type: 'addHistory',
      url: youtubeUrlPrefix +
        extractVideoId(document.location.href),
    });
  }
}, 1000);