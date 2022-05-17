(() => {
  // require('crx-hotreload');
  const MAX_VIDEOS = 30,
    MAX_PINNED = 30;
  SYNC_INTERVAL = 60000;

  let browser = require('webextension-polyfill');
  let history = {};
  browser.storage.local.get(['videoHistory'])
    .then(obj => {
      history = obj.videoHistory
        ? obj.videoHistory
        : history;
    });

  const syncHistory = () => {
    browser.storage.local.set({
      videoHistory: history
    });
  }

  const createContextMenus = () => {
    browser.contextMenus.removeAll().then(() => {
      browser.contextMenus.create({
        title: 'Instant Play',
        id: 'Parent',
        contexts: ['all'],
      });

      if (Object.keys(history).length > 0) {
        const pinned = history.pinned;

        browser.contextMenus.create({
          title: 'Pinned',
          parentId: 'Parent',
          id: 'Pinned',
          contexts: ['all']
        });

        if (pinned.length > 0) {
          for (
            let i = 0;
            i < Math.min(MAX_PINNED, pinned.length);
            i++
          ) {
            const id = pinned[i].url + pinned[i].title;

            browser.contextMenus.create({
              title: pinned[i].title,
              parentId: 'Pinned',
              id: id,
              contexts: ['all']
            });

            browser.contextMenus.create({
              title: 'Play',
              parentId: id,
              contexts: ['all'],
              onclick: (_, tab) => {
                play(pinned[i], tab);
                createContextMenus();
              }
            });

            browser.contextMenus.create({
              title: 'Unpin',
              parentId: id,
              contexts: ['all'],
              onclick: () => {
                unpin(pinned[i]);
                createContextMenus();
              }
            });
          }
        } else {
          browser.contextMenus.update(
            'Pinned',
            { enabled: false }
          );
        }
      }

      if (Object.keys(history).length > 0) {
        const all = history.all;

        chrome.contextMenus.create({
          type: 'separator',
          parentId: 'Parent',
          contexts: ['all']
        });

        for (
          let i = 0;
          i < Math.min(MAX_VIDEOS,
            all.length);
          i++
        ) {
          const _id = all[i].title + all[i].url;

          browser.contextMenus.create({
            title: all[i].title,
            parentId: 'Parent',
            id: _id,
            contexts: ['all']
          });

          browser.contextMenus.create({
            title: 'Play',
            parentId: _id,
            contexts: ['all'],
            onclick: (_, tab) => {
              play(all[i], tab);
              createContextMenus();
            },
          });

          browser.contextMenus.create({
            title: 'Pin',
            parentId: _id,
            contexts: ['all'],
            onclick: () => {
              pin(all[i]);
              createContextMenus();
            },
          });

          browser.contextMenus.create({
            title: "Pin && Play",
            parentId: _id,
            contexts: ['all'],
            onclick: (_, tab) => {
              pin(all[i]);
              play(all[i], tab);
              createContextMenus();
            },
          });

          browser.contextMenus.create({
            title: 'Remove',
            parentId: _id,
            contexts: ['all'],
            onclick: () => {
              removeAll(all[i]);
              createContextMenus();
            },
          });
        }
      }
    });
  };

  createContextMenus();

  const play = (entry, tab) => {
    browser.tabs.query({}).then((tabs) => {
      for (const _tab of tabs) {
        if (_tab.id !== tab.id) {
          browser.tabs.sendMessage(
            _tab.id,
            { type: 'closeVideo' },
            null
          );
        } else {
          browser.tabs.sendMessage(
            tab.id,
            {
              type: 'dispalyVideo',
              url: entry.url
            },
            null
          );
          add(entry.url);
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

  const getViewsInfoByUrls = (urls, sender) => {
    for (let url of urls) {
      if (
        (url !== null && url.includes('www.youtube.com')) ||
        url.includes('www.bilibili.com') ||
        url.includes('m.bilibili.com')
      ) {
        try {
          getSourceAsDOM(url, (document) => {
            try {
              if (url.includes('www.youtube.com')) {
                let scripts = document.querySelectorAll('script'),
                  script = scripts[scripts.length - 5].innerText,
                  index = script.indexOf('simpleText'),
                  subscript = script.substr(index - 2, 40),
                  viewCount = subscript.split('"')[3];
                browser.tabs.sendMessage(sender.tab.id, {
                  type: 'viewCount',
                  url: url,
                  viewCount: viewCount,
                });
              } else {
                let viewCount = document.getElementsByClassName('l-con-bar')[0];
                viewCount = viewCount
                  ? viewCount.innerText
                  : document.getElementsByClassName('video-data')[0].innerText;

                browser.tabs.sendMessage(sender.tab.id, {
                  type: 'viewCount',
                  url: url,
                  viewCount: viewCount.includes('弹幕')
                    ? viewCount.split('弹幕')[0] + '弹幕'
                    : viewCount,
                });
              }
            } catch (e) {
              console.log(e, document.body);
            }
          });
        } catch (e) {
          console.log(e);
        }
      } else {
        browser.tabs.sendMessage(sender.tab.id, {
          type: 'viewCount',
          url: url,
          viewCount: null,
        });
      }
    }
  };

  const getVideoTitle = (url, callback) => {
    try {
      getSourceAsDOM(url, (document) => {
        callback(document.title);
      });
    } catch (e) {
      console.error('Failed to retrieve video title');
    }
  };

  const getSourceAsDOM = (url, callback) => {
    let xmlhttp = new XMLHttpRequest();
    let parser = new DOMParser();
    xmlhttp.open('GET', url, true);
    xmlhttp.onreadystatechange = () => {
      if (
        xmlhttp.readyState === XMLHttpRequest.DONE &&
        xmlhttp.status === 200
      ) {
        callback(parser.parseFromString(xmlhttp.responseText, 'text/html'));
      }
    };
    xmlhttp.send();
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

  const add = (url) => {
    getVideoTitle(url, (title) => {
      addHistoryEntry({
        url: url,
        title: trimTitle(title)
      });
    });
  }

  const isAllChinese = (str) => {
    return /^[\u4E00-\u9FA5]+$/.test(str);
  }

  const trimTitle = (title) => {
    title = title.trim().replace(' - YouTube', '');
    const len = 25;
    return title.length < len
      ? title
      : title.substring(0, len) + ' ...';
  }

  browser.runtime.onMessage.addListener(
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
          browser.tabs.sendMessage(
            sender.tab.id,
            { type: 'favicon', url: sender.tab.favIconUrl },
            null
          );
          break;
        case 'changeVideoTime':
          browser.tabs.executeScript(sender.tab.id, {
            code: changeVideoTime(message.time),
            allFrames: true,
          });
          break;
        case 'closeOthers':
          browser.tabs.query({}).then((tabs) => {
            for (const tab of tabs) {
              if (tab.id !== sender.tab.id) {
                browser.tabs.sendMessage(tab.id,
                  { type: 'closeVideo' }, null);
              }
            }
          });
          add(message.url);
          break;
      }
    });

  setInterval(syncHistory, SYNC_INTERVAL);
})();
