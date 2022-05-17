'use strict';
import '../css/style.css';

(function () {
  let browser = require('webextension-polyfill');

  window.onload = () => {
    if (document.location.href.includes('youtube.com/watch')) {
      browser.storage.local.set({
        lastVideoLink: getYoutubeEmbeddedVideoUrl(document.location.href),
      });
    }
  };

  // if (document.location.href.includes('youtube.com') ||
  //   document.location.href.includes('bilibili.com')) return;

  let videoLinks,
    iframe,
    iframeContainer,
    videoPanel,
    controlBar,
    dotContainer,
    closeDot,
    closeLogo,
    offset = [0, 0],
    globalOffset = [0, 0],
    mouseDown,
    globalMouseDown,
    currentPlayButton,
    logoUrlMap = new Map(),
    urlButtonMap = new Map(),
    processedLinks = [];

  let _src;

  const PLAYBUTTON = `
        <svg height='24' focusable='false' 
        xmlns='http://www.w3.org/2000/svg' 
        viewBox='0 0 24 24' style='opacity:100%;fill:white;
        margin: 22px 50px 20px 46px'>
            <path d='M12 2C6.48 2 2 
                6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 
                2zm-2 14.5v-9l6 4.5-6 4.5z'>
            </path>
        </svg>
    `;

  const supportedDomains = {
    youtube: 'youtube.com',
    bilibili: 'bilibili.com',
  };

  function isSelectable(element) {
    let unselectableTypes;
    if (!(element instanceof Element)) {
      return false;
    }

    unselectableTypes = [
      'button',
      'checkbox',
      'color',
      'file',
      'hidden',
      'image',
      'radio',
      'reset',
      'submit',
    ];
    return (
      (element.nodeName.toLowerCase() === 'input' &&
        unselectableTypes.indexOf(element.type) === -1) ||
      element.nodeName.toLowerCase() === 'textarea' ||
      element.isContentEditable
    );
  }

  function createVideoPanel() {
    iframe = document.createElement('iframe');
    closeDot = document.createElement('div');
    closeLogo = document.createElement('img');
    dotContainer = document.createElement('div');

    controlBar = document.createElement('div');
    iframeContainer = document.createElement('div');
    videoPanel = document.createElement('div');

    iframe.className = 'instantYoutubeEmbeddedVideo';
    controlBar.className = 'instantYoutubeControlBar';
    dotContainer.className = 'instantYoutubeDotContainer';
    closeDot.className = 'instantYoutubeCloseDot';
    closeLogo.className = 'closeLogo';
    iframeContainer.className = 'instantYoutubeVideoContainer';
    videoPanel.className = 'videoPanel';
    closeLogo.className = 'closeLogo';
    closeLogo.src = browser.extension.getURL('images/closeLogo.png');

    closeDot.appendChild(closeLogo);
    dotContainer.appendChild(closeDot);
    controlBar.appendChild(dotContainer);
    iframeContainer.appendChild(controlBar);
    iframeContainer.appendChild(iframe);
    videoPanel.appendChild(iframeContainer);

    iframe.setAttribute('title', 'Video player');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; ' +
      'clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    );
    iframe.setAttribute('allowfullscreen', '');

    closeDot.onmouseover = () => {
      closeLogo.style.display = 'block';
    };

    closeDot.onmouseleave = () => {
      closeLogo.style.display = 'none';
    };

    closeDot.onclick = removeVideo;

    controlBar.onmousedown = (e) => {
      mouseDown = true;
      offset = [
        videoPanel.offsetLeft - e.clientX,
        videoPanel.offsetTop - e.clientY,
      ];
    };

    controlBar.onmouseup = () => {
      mouseDown = false;
      globalMouseDown = false;
    };

    window.onmousedown = (e) => {
      globalMouseDown = true;
      globalOffset = [
        videoPanel.offsetLeft - e.clientX,
        videoPanel.offsetTop - e.clientY,
        videoPanel.offsetLeft +
        parseInt(videoPanel.style.width.replace('px', '')),
        videoPanel.offsetTop +
        parseInt(videoPanel.style.height.replace('px', '')),
      ];
    };

    window.onmouseup = () => {
      globalMouseDown = false;
    };

    window.onmousemove = (e) => {
      const delta = 20;
      const bound = iframeContainer.getBoundingClientRect();

      const deltaLeft = bound.left - e.clientX,
        deltaRight = e.clientX - bound.right,
        deltaTop = bound.top - e.clientY,
        deltaBottom = e.clientY - bound.bottom;

      let cursorStyle;

      if (bound.left < e.clientX && bound.right > e.clientX) {
        if (deltaTop > 0 && deltaTop < delta)
          cursorStyle = 'n-resize';
        else if (deltaBottom > 0 && deltaBottom < delta)
          cursorStyle = 's-resize';
        else cursorStyle = 'default';
      } else if (
        bound.top < e.clientY &&
        bound.bottom > e.clientY
      ) {
        if (deltaLeft > 0 && deltaLeft < delta)
          cursorStyle = 'w-resize';
        else if (deltaRight > 0 && deltaRight < delta)
          cursorStyle = 'e-resize';
        else cursorStyle = 'default';
      }

      document.body.style.cursor = cursorStyle;

      if (mouseDown) {
        videoPanel.style.left =
          e.clientX + offset[0] + 'px';

        videoPanel.style.top =
          e.clientY + offset[1] + 'px';
      } else if (globalMouseDown) {
        if (
          document.body.style.cursor === 'w-resize') {
          videoPanel.style.left =
            e.clientX + globalOffset[0] + 'px';

          videoPanel.style.width =
            globalOffset[2] -
            videoPanel.offsetLeft + 'px';
        } else if (
          document.body.style.cursor === 'e-resize'
        ) {
          videoPanel.style.width =
            e.clientX - 1.5 * delta -
            videoPanel.offsetLeft + 'px';
        } else if (
          document.body.style.cursor === 'n-resize'
        ) {
          videoPanel.style.top =
            e.clientY + globalOffset[1] + 'px';

          videoPanel.style.height =
            globalOffset[3] -
            videoPanel.offsetTop + 'px';
        } else if (
          document.body.style.cursor === 's-resize'
        ) {
          videoPanel.style.height =
            e.clientY - 1.5 * delta -
            videoPanel.offsetTop + 'px';
        }
      }
    };
  }

  function addClickEventListenerToThumbnails() {
    let thumbnail = getVideoLinksWithThumbnail();

    for (let link of thumbnail) {
      let thumbnail = !!link.querySelector('g-img')
        ? link.querySelector('g-img')
        : link.querySelector('img');

      thumbnail.parentElement.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          makeVideo(link.href);
          insertPlayButton(thumbnail);
          changeVideoButtonColor(thumbnail.parentElement);
        },
        true
      );
    }
  }

  function insertPlayButton(element) {
    if (!element.querySelector('svg'))
      element.childNodes[1].innerHTML = PLAYBUTTON;
  }

  function changeVideoButtonColor(element) {
    let button = element.querySelector('svg');
    if (!!button) button.style.fill = 'red';
  }

  function getVideoLinksWithThumbnail() {
    return Array.from(document.querySelectorAll('a'))
      .filter((link) => isSupportedVideoLink(link))
      .filter((link) => link.querySelector('img'));
  }

  function makeVideo(src) {
    setVideoFrameBoundAsBefore();
    iframe.setAttribute(
      'src',
      src.includes('embed')
        ? src
        : getEmbeddedVideoUrl(src)
    );
    document.body.insertBefore(
      videoPanel,
      document.body.childNodes[0]
    );

    if (videoPanel.getBoundingClientRect().height < 30)
      videoPanel.style.height = '50%';

    changeFavicon();
  }

  function getEmbeddedVideoUrl(href) {
    if (href.includes(supportedDomains.youtube))
      return getYoutubeEmbeddedVideoUrl(href);
    else if (href.includes(supportedDomains.bilibili)) {
      return getBilibiliEmbeddedVideoUrl(href);
    }
  }

  function getYoutubeEmbeddedVideoUrl(url) {
    return url.split('&')[0].replace('watch?v=', 'embed/') + '?autoplay=1';
  }

  function getBilibiliEmbeddedVideoUrl(href) {
    if (href.includes('av')) {
      return (
        '//player.bilibili.com/player.html?aid=' +
        href.split('av')[1].split('/')[0]
      );
    } else {
      if (href.includes('?')) href = href.split('?')[0];
      href = href.split('/');
      return (
        '//player.bilibili.com/player.html?bvid=' +
        href[href.indexOf('video') + 1]
      );
    }
  }

  function saveVideoFrame(resolve) {
    browser.storage.local
      .set({
        videoFrameBound: JSON.stringify(
          videoPanel.getBoundingClientRect()
        ),
      }).then(resolve);
  }

  function setVideoFrameBoundAsBefore() {
    browser.storage.local.get(['videoFrameBound'])
      .then(function (info) {
        let bound;

        if (info && info.videoFrameBound)
          bound = JSON.parse(info.videoFrameBound);

        if (bound && bound.height > 30) {
          videoPanel.style.top = bound.top.toString() + 'px';
          videoPanel.style.height = (bound.height - 40).toString() + 'px';
          videoPanel.style.width = (bound.width - 40).toString() + 'px';
          videoPanel.style.left = bound.left.toString() + 'px';
        }
      });
  }

  function isSupportedVideoLink(videoLink) {
    return (
      (videoLink.href.indexOf('https://www.youtube.com/watch') === 0 &&
        !videoLink.href.includes('t=')) ||
      (videoLink.href.indexOf('https://www.bilibili.com') === 0 &&
        videoLink.href.includes('video')) ||
      (videoLink.href.includes('m.bilibili.com') &&
        videoLink.href.indexOf('https://m.bilibili.com') === 0 &&
        videoLink.href.includes('video'))
    );
  }

  function insertPlayButtons() {
    if (
      document.getElementsByClassName(
        'instantYoutubeViewCount').length === 0 &&
      !document.location.href.includes('youtube.com') &&
      !document.location.href.includes('bilibili.com')
    ) {
      videoLinks = Array.from(document.querySelectorAll('a'));

      let urls = videoLinks.reduce(function (result, videoLink) {
        if (isSupportedVideoLink(videoLink)) {
          if (
            !result.includes(videoLink.href) ||
            videoLink.querySelector('img')
          ) {
            let container = document.createElement('div');
            container.className = 'instantYoutubeButtonContainer';

            let shadowRoot = container.attachShadow({ mode: 'open' });
            shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    color: #444444;
                    font-size: 15px;
                    align-items: center;
                    height: 24px;
                }
            
                .instantYoutubeWatchButton {
                    height: 20px;
                    width: 20px;
                    cursor: pointer;
                    border: none;
                    margin-right: 8px;
                    padding: 1px 0 1px 0;
                    display: flex;
                    align-items: center;
                }
                
                .instantYoutubeViewCount {
                    color: #555555;
                    text-align: center;
                    /*margin-top: 2px;*/
                }
            </style>`;

            let button = document.createElement('div');
            button.className = 'instantYoutubeWatchButton';
            button.innerHTML = `<svg fill='#555555' viewBox='0 0 24 24'>
                    <path d='M10 16.5l6-4.5-6-4.5v9zM5 20h14a1 1 0 0 0 1-1V5a1 1 0 0 
                    0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1zm14.5 2H5a3 3 0 0 1-3-3V4.4A2.4 2.4 
                    0 0 1 4.4 2h15.2A2.4 2.4 0 0 1 22 4.4v15.1a2.5 2.5 0 0 1-2.5 2.5'>
                    </path>
                    </svg>`;

            shadowRoot.appendChild(button);
            button.onclick = (e) => {
              e.preventDefault();
              e.stopImmediatePropagation();
              buttonClickHandler(videoLink, button);
            };

            if (
              !videoLink.querySelector('img') ||
              videoLinks.filter((link) => link.href === videoLink.href)
                .length ===
              videoLinks.filter(
                (link) =>
                  link.href === videoLink.href && link.querySelector('img')
              ).length ||
              window.location.href.includes('duckduckgo')
            ) {
              videoLink.parentNode.insertBefore(
                container,
                videoLink.nextSibling
              );
              result.push(videoLink.href);
              logoUrlMap.set(videoLink, container);
              urlButtonMap.set(videoLink.href, {
                videoLink: videoLink,
                button: button,
              });
            }
          }
        }
        return result;
      }, []);

      if (!document.location.href.includes('www.youtube.com'))
        browser.runtime.sendMessage({
          type: 'viewCount',
          urls: urls,
        });
    }
  }

  function changeVideoTime(url) {
    url = url.split('&t=');

    browser.runtime.sendMessage({
      type: 'changeVideoTime',
      url: url[0],
      time: url.length > 1 ? url[1] : 0,
    });
  }

  function buttonClickHandler(videoLink, button) {
    let src,
      href = videoLink.href;

    if (href.includes('youtube')) {
      src = href.split('&')[0];
      src = src.replace('watch?v=', 'embed/') + '?autoplay=1';

      if (
        document.getElementsByClassName('instantYoutubeVideoContainer')
          .length !== 0 &&
        src === iframe.src
      )
        return;

      button.firstChild.style.fill = '#DD0000';
    } else {
      if (href.includes('av')) {
        src =
          '//player.bilibili.com/player.html?aid=' +
          href.split('av')[1].split('/')[0];
      } else {
        if (href.includes('?')) href = href.split('?')[0];
        src = href.split('/');
        src =
          '//player.bilibili.com/player.html?bvid=' +
          src[src.indexOf('video') + 1];
      }
      button.firstChild.style.fill = 'rgb(0, 160, 215)';
    }

    if (currentPlayButton) currentPlayButton.firstChild.style.fill = '';

    currentPlayButton = button;

    browser.runtime.sendMessage({
      type: 'closeOthers',
      url: videoLink.href,
    });

    makeVideo(src);
  }

  function keyMomentsHandler() {
    new MutationObserver(function () {
      try {
        let videoLinks = Array.from(document.querySelectorAll('a'));
        for (let i = 0; i < videoLinks.length; i++) {
          let videoLink = videoLinks[i];

          if (processedLinks.includes(videoLink)) return;
          else processedLinks.push(videoLink);

          if (
            videoLink.href.indexOf('https://www.youtube.com/watch') === 0 &&
            videoLink.href.includes('t=')
          ) {
            let href = videoLink.href;

            videoLink.onclick = (e) => {
              e.preventDefault();
              e.stopImmediatePropagation();

              /* Google search could change href after clicking for Firefox */
              videoLink.href = href;

              let url = href.split('&t')[0],
                urlButton = urlButtonMap.get(url),
                /* Will change after buttonClickHandler */
                previousIframeSrc = iframe.src;

              buttonClickHandler(urlButton.videoLink, urlButton.button);

              let timeout =
                previousIframeSrc &&
                  previousIframeSrc.includes(url.split('v=')[1])
                  ? 0
                  : 1000;
              window.setTimeout(() => {
                changeVideoTime(videoLink.href);
              }, timeout);
            };
          }
        }
      } catch (error) {
        console.log(error);
      }
    }).observe(document, { childList: true, subtree: true });
  }

  function removeVideo() {
    restoreFavicon();
    if (
      document.getElementsByClassName(
        'instantYoutubeVideoContainer'
      ).length > 0
    ) {
      saveVideoFrame(() => {
        // changeVideoTime(iframe.src);
        closeLogo.style.display = 'none';
        iframe.src = null;
        videoPanel.parentNode.removeChild(videoPanel);
      });
    }
  }

  window.addEventListener('beforeunload', () => {
    removeVideo();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') removeVideo();
  });

  function insertVideoViewCount(message) {
    for (let videoLink of videoLinks) {
      if (
        videoLink.href === message.url &&
        message.viewCount !== undefined &&
        message.viewCount !== null
      ) {
        let viewCount = document.createElement('div');
        viewCount.className = 'instantYoutubeViewCount';
        viewCount.innerHTML = message.viewCount;

        let container = logoUrlMap.get(videoLink);
        if (container) {
          logoUrlMap.delete(videoLink);
          container.shadowRoot.appendChild(viewCount);
        }
      }
    }
  }

  let originalFavicon;
  const changeFavicon = () => {
    let link = document.querySelector(
      "link[rel~='icon']"
    );
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName(
        'head'
      )[0].appendChild(link);
    }

    browser.runtime.sendMessage({
      type: 'getFaviconURL',
    });

    link.href = browser.extension.getURL(
      'images/Logo.png'
    );
  };

  const restoreFavicon = () => {
    let link = document.querySelector(
      "link[rel~='icon']"
    );
    link.href = originalFavicon;
  };

  browser.runtime.onMessage.addListener(
    (message) => {
      switch (message.type) {
        case 'viewCount':
          insertVideoViewCount(message);
          break;
        case 'closeVideo':
          removeVideo();
          break;
        case 'favicon':
          originalFavicon = originalFavicon
            ? originalFavicon
            : message.url;
          break;
        case 'dispalyVideo':
          makeVideo(message.url);
          globalMouseDown = false;
          break;
      }
    });

  window.onload = () => {
    const eventMethod = window.addEventListener
      ? 'addEventListener'
      : 'attachEvent';

    const eventer = window[eventMethod];
    const messageEvent = eventMethod == 'attachEvent'
      ? 'onmessage'
      : 'message';

    eventer(
      messageEvent,
      function (e) {
        if (
          e.message === 'removeVideo' ||
          e.data === 'removeVideo'
        )
          removeVideo();
      },
      false
    );

    if (
      document.getElementsByClassName(
        'instantYoutubeButtonContainer'
      ).length === 0
    )
      insertPlayButtons();
  };

  window.setInterval(() => {
    if (
      !isSelectable(document.activeElement) &&
      window.getSelection().toString().length === 0
    ) {
      if (iframe.contentWindow !== null) {
        iframe.contentWindow.postMessage({
          focus: true
        }, '*');
      }
    }
  }, 1000);

  function main() {
    createVideoPanel();
    setVideoFrameBoundAsBefore();
    // addClickEventListenerToThumbnails();
    insertPlayButtons();
    keyMomentsHandler();
  }

  main();
})();
