import Browser from 'webextension-polyfill';
import { DOMParser, parseHTML } from 'linkedom';

(() => {
  const MAX_VIDEOS = 15,
    MAX_PINNED = 15,
    SYNC_INTERVAL = 60000,
    PINNED_OPTION_ENABLED = false,
    DEFAULT_LEN = 30,
    MAX_LEN = 35;

  let history = {};

  // const onLastError = (error) => { console.log(error); }
  const onLastError = () => void chrome.runtime.lastError;

  Browser.storage.local.get(['videoHistory'])
    .then(obj => {
      history = obj.videoHistory
        ? obj.videoHistory
        : history;
    }).catch(onLastError);

  const syncHistory = () => {
    Browser.storage.local.set({
      videoHistory: history
    });
  }

  const createContextMenus = () => {
    syncHistory();

    Browser.contextMenus.removeAll().then(() => {
      chrome.contextMenus.create({
        title: 'Instant Play',
        id: 'Parent',
        contexts: ['all'],
      }, () => void chrome.runtime.lastError);

      chrome.contextMenus.create({
        title: 'Latest',
        parentId: 'Parent',
        id: 'Latest',
        enabled: false,
        contexts: ['all']
      }, () => void chrome.runtime.lastError);

      if (Object.keys(history).length > 0) {
        let all = history.all;
        if (all.length > 0) {
          chrome.contextMenus.create({
            type: 'separator',
            parentId: 'Parent',
            id: 'Separator_latest',
            contexts: ['all']
          }, () => void chrome.runtime.lastError);

          for (let i = 0;
            i < Math.min(MAX_VIDEOS,
              all.length); i++) {
            const _id = all[i].url;

            chrome.contextMenus.create({
              title: trimTitle(all[i].title),
              parentId: 'Parent',
              id: _id,
              contexts: ['all']
            }, () => void chrome.runtime.lastError);

            const contextClick = (info, tab) => {
              const { menuItemId } = info
              if (menuItemId === _id) {
                play(all[i], tab);
                createContextMenus();
              } else if (menuItemId === 'Clear') {
                history['all'] = [];
                createContextMenus();
              }
            }
            chrome.contextMenus.onClicked.addListener(contextClick);
          }

          chrome.contextMenus.create({
            type: 'separator',
            parentId: 'Parent',
            id: 'Separator_clear',
            contexts: ['all']
          }, () => void chrome.runtime.lastError);

          chrome.contextMenus.create({
            title: 'Clear all',
            parentId: 'Parent',
            id: 'Clear',
            contexts: ['all']
          }, () => void chrome.runtime.lastError);
        }
      }
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
            type: 'dispalyVideo',
            url: entry.url
          }).then(_ => {
            add(entry.url);
          }).catch(onLastError);;
        }
      }
    });
  }

  const pin = (entry) => {
    remove('pinned', entry);
    history.pinned.unshift(entry);
  }

  const unpin = (entry) => {
    remove('pinned', entry);
  }

  const remove = (historyKey, entry) => {
    history[historyKey] =
      history[historyKey].filter(
        _entry => _entry.url !== entry.url
      );
  }

  const removeAll = (entry) => {
    Object.keys(history).forEach((key) => {
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
    if (Object.keys(history).length === 0) {
      history = {
        all: [entry],
        pinned: []
      }
    } else {
      let all = history.all;
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
    const document = await getSourceAsDOM(url);
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
    (message, sender) => {
      switch (message.type) {
        case 'addHistory':
          if (!message.url.includes('embed'))
            add(message.url);
          break;
        case 'viewCount':
          getViewsInfoByUrls(message.urls, sender);
          break;
        case 'getFaviconURL':
          Browser.tabs.sendMessage(
            sender.tab.id,
            { type: 'favicon', url: sender.tab.favIconUrl }
          ).then(_ => { }).catch(onLastError);
          break;
        case 'changeVideoTime':
          Browser.scripting.executeScript(sender.tab.id, {
            code: changeVideoTime(message.time),
            allFrames: true,
          });
          break;
        case 'closeOthers':
          Browser.tabs.query({}).then((tabs) => {
            for (const tab of tabs) {
              if (tab.id !== sender.tab.id) {
                Browser.tabs.sendMessage(tab.id,
                  { type: 'closeVideo' }).then(_ => { }).catch(onLastError);
              }
            }
          });
          add(message.url);
          break;
      }
    });

  setInterval(syncHistory, SYNC_INTERVAL);
})();
