import Browser from 'webextension-polyfill';
import { parseHTML } from 'linkedom';

(() => {
  const MAX_VIDEOS = 15,
    MAX_PINNED = 15,
    SYNC_INTERVAL = 1000,
    PINNED_OPTION_ENABLED = false,
    DEFAULT_LEN = 30,
    MAX_LEN = 35;

  const onLastError = () => void chrome.runtime.lastError;

  let historyCache = {};
  chrome.storage.local.get(['videoHistory'],
    obj => {
      historyCache = obj.videoHistory || {};
      createContextMenus();
    });

  const syncHistory = () => {
    chrome.storage.local.set({
      videoHistory: historyCache
    });
  }

  const contextClick = (info, tab) => {
    const { menuItemId } = info;
    if (menuItemId === 'Clear') {
      historyCache['all'] = [];
      syncHistory();
      createContextMenus();
    } else {
      let all = historyCache.all;
      for (let i = 0; i < all.length; i++) {
        if (menuItemId === all[i].url) {
          play(all[i], tab);
        }
      }
    }
  }

  const createContextMenus = () => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        title: 'Instant Play',
        id: 'Parent',
        contexts: ['all'],
      }, onLastError);

      chrome.contextMenus.create({
        title: 'Latest',
        parentId: 'Parent',
        id: 'Latest',
        enabled: false,
        contexts: ['all']
      }, onLastError);

      if (Object.keys(historyCache).length > 0) {
        let all = historyCache.all;
        if (all.length > 0) {
          chrome.contextMenus.create({
            type: 'separator',
            parentId: 'Parent',
            id: 'Separator_latest',
            contexts: ['all']
          }, onLastError);

          for (let i = 0;
            i < Math.min(MAX_VIDEOS,
              all.length); i++) {
            const _id = all[i].url;

            chrome.contextMenus.create({
              title: trimTitle(all[i].title),
              parentId: 'Parent',
              id: _id,
              contexts: ['all']
            }, onLastError);
          }

          chrome.contextMenus.create({
            type: 'separator',
            parentId: 'Parent',
            id: 'Separator_clear',
            contexts: ['all']
          }, onLastError);

          chrome.contextMenus.create({
            title: 'Clear all',
            parentId: 'Parent',
            id: 'Clear',
            contexts: ['all']
          }, onLastError);
        }
      }
      chrome.contextMenus.onClicked.addListener(contextClick);
    });
  };

  createContextMenus();

  const play = (entry, tab) => {
    Browser.tabs.query({}).then((tabs) => {
      for (const _tab of tabs) {
        if (_tab.id !== tab.id) {
          Browser.tabs.sendMessage(
            _tab.id,
            { type: 'closeVideo' })
            .then(_ => {
            }).catch(onLastError);
        } else {
          Browser.tabs.sendMessage(
            tab.id, {
            type: 'displayVideo',
            url: entry.url
          }).then(_ => {
            addHistoryEntry(entry);
          }).catch(onLastError);;
        }
      }
    });
  }

  const pin = (entry) => {
    remove('pinned', entry);
    historyCache.pinned.unshift(entry);
  }

  const unpin = (entry) => {
    remove('pinned', entry);
  }

  const remove = (historyKey, entry) => {
    historyCache[historyKey] =
      historyCache[historyKey].filter(
        _entry => _entry.url !== entry.url
      );
  }

  const removeAll = (entry) => {
    Object.keys(historyCache).forEach((key) => {
      remove(key, entry);
    });
  }

  const changeVideoTime = (currentTime) => {
    return `
      (function() {
          let video = document.querySelector('video');
          if (video !== null) {
              video.currentTime = ${currentTime}; 
              video.play();
          }
      })();`;
  };

  const getViewsInfoByUrls = async (urls, sender) => {
    for (let url of urls) {
      if (
        (url !== null &&
          url.includes('www.youtube.com')) ||
        url.includes('www.bilibili.com') ||
        url.includes('m.bilibili.com')
      ) {
        const document = await getSourceAsDOM(url);
        try {
          let viewCount;
          if (url.includes('www.youtube.com')) {
            let scripts =
              document.querySelectorAll('script'),
              script = scripts[scripts.length - 5].innerText,
              index = script.indexOf('simpleText'),
              subscript = script.substr(index - 2, 40);
            viewCount = subscript.split('"')[3];
          } else {
            viewCount =
              document.getElementsByClassName(
                'l-con-bar'
              )[0];
            viewCount = viewCount
              ? viewCount.innerText
              : document.getElementsByClassName(
                'video-data'
              )[0].innerText;
          }
          Browser.tabs.sendMessage(sender.tab.id, {
            type: 'viewCount',
            url: url,
            viewCount: viewCount,
          });
        } catch (e) {
          console.log(e, document.body);
        }
      } else {
        Browser.tabs.sendMessage(sender.tab.id, {
          type: 'viewCount',
          url: url,
          viewCount: null,
        });
      }
    }
  };

  const getSourceAsDOM = async (url) => {
    const headers = new Headers({
      Accept: "application/json," +
        "application/xml," +
        "text/plain, text/html"
    });

    const response = await fetch(url, {
      headers: headers,
      method: "GET",
      mode: 'cors'
    });

    if (!response.ok) {
      console.log('Failed to fetch');
    }
    const html = await response.text();
    const doc = await parseHTML(html);
    return doc.document;
  };

  const addHistoryEntry = (entry) => {
    if (Object.keys(historyCache).length === 0) {
      historyCache = {
        all: [entry],
        pinned: []
      }
    } else {
      let all = historyCache.all;
      for (const [index, item] of all.entries()) {
        if (item.url === entry.url) {
          all.splice(index, 1);
        }
      }
      all.unshift(entry);
    }
    createContextMenus();
  }

  const add = async (url) => {
    if (Object.keys(historyCache).length > 0 &&
      historyCache.all[0].url === url) return;
    const document =
      await getSourceAsDOM(url);
    addHistoryEntry({
      url: url,
      title: document.title
    });
  }

  const isAllChinese = (str) => {
    return /^[\u4E00-\u9FA5]+$/.test(str);
  }

  function countChinese(str) {
    return (str.match(/[\u4E00-\u9FA5]/g) || []).length;
  }

  const trimTitle = (title) => {
    title = title.trim().replace(' - YouTube', '');
    const len = DEFAULT_LEN - Math.ceil(
      countChinese(title.substring(0, DEFAULT_LEN)) / 2
    );
    return title.length <= len
      ? title
      : title.substring(0, len) + ' ...';
  }

  const nextSpaceIndex = (curIndex, str) => {
    for (
      let i = curIndex;
      i < Math.min(MAX_LEN, str.length); i++
    ) {
      if (str[i] === ' ') return i;
    }
    return curIndex;
  }

  Browser.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
      switch (message.type) {
        case 'addHistory':
          add(message.url);
          break;
        case 'viewCount':
          getViewsInfoByUrls(message.urls, sender);
          break;
        case 'getFaviconURL':
          sendResponse({
            type: 'favicon',
            url: sender.tab.favIconUrl
          });
          break;
        case 'changeVideoTime':
          Browser.scripting.executeScript(
            sender.tab.id, {
            code: changeVideoTime(message.time),
            allFrames: true,
          });
          break;
        case 'closeOthers':
          Browser.tabs.query({}).then((tabs) => {
            for (const tab of tabs) {
              if (tab.id !== sender.tab.id) {
                Browser.tabs.sendMessage(tab.id,
                  { type: 'closeVideo' })
                  .then(_ => { }).catch(onLastError);
              }
            }
          });
          add(message.url);
          break;
      }
    });

  setInterval(syncHistory, SYNC_INTERVAL);
})();
