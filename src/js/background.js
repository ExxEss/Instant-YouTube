(function () {
    require("crx-hotreload");
    let browser = require("webextension-polyfill");

    function changeVideoTime(currentTime) {
        return `
            (function() {
                let video = document.querySelector('video');
                if (video !== null) {
                    video.currentTime = ${currentTime}; 
                    video.play();
                }
            })();`;
     }

    browser.runtime.onMessage.addListener(
        function (message, sender) {
            if (message.type === "viewCount")
                getViewsInfoByUrls(message.urls, sender);
            else if (message.type === "changeVideoTime") {
                browser.tabs.executeScript(sender.tab.id,
                    {code: changeVideoTime(message.time), allFrames: true});
            }
        });

    function getViewsInfoByUrls(urls, sender) {
        for (let url of urls) {
            if (url !== null && url.includes("www.youtube.com") || url.includes("www.bilibili.com") || url.includes("m.bilibili.com")) {
                try {
                    getSourceAsDOM(url, (dom) => {
                        try {
                            if (url.includes("www.youtube.com")) {
                                let scripts = dom.querySelectorAll("script"),
                                    script = scripts[scripts.length - 5].innerText,
                                    index = script.indexOf("simpleText"),
                                    subscript = script.substr(index - 2, 40),
                                    viewCount = subscript.split("\"")[3];
                                browser.tabs.sendMessage(sender.tab.id, {
                                    type: "viewCount",
                                    url: url,
                                    viewCount: viewCount
                                });
                            } else {
                                let viewCount = dom.getElementsByClassName("l-con-bar")[0];
                                viewCount = viewCount ? viewCount.innerText
                                    : dom.getElementsByClassName("video-data")[0].innerText;

                                browser.tabs.sendMessage(sender.tab.id, {
                                    type: "viewCount",
                                    url: url,
                                    viewCount: viewCount.includes("弹幕")
                                        ? viewCount.split("弹幕")[0] + "弹幕"
                                        : viewCount
                                });
                            }
                        } catch (e) {
                            console.log(e, dom.body);
                        }
                    });
                } catch (e) {
                    console.log(e);
                }
            } else {
                browser.tabs.sendMessage(sender.tab.id,
                    {type: "viewCount", url: url, viewCount: null});
            }
        }
    }

    function getSourceAsDOM(url, callback) {
        let xmlhttp = new XMLHttpRequest();
        let parser = new DOMParser();
        xmlhttp.open("GET", url, true);
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState === XMLHttpRequest.DONE && xmlhttp.status === 200) {
                callback(parser.parseFromString(xmlhttp.responseText, "text/html"));
            }
        }
        xmlhttp.send();
    }
})();
