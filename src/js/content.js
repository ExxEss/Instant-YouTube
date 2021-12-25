"use strict";
import "../css/style.css";
import Util from "./util";
import Browser from "webextension-polyfill";

(function () {
    if (document.location.href.includes('youtube') || 
    document.location.href.includes('bilibili')) return;
    
    let videoLinks,
        iframe,
        iframeContainer,
        controlBar,
        dotContainer,
        closeDot,
        closeLogo,
        mousePosition,
        offset = [0, 0],
        mouseDown,
        currentPlayButton,
        logoUrlMap = new Map(),
        urlButtonMap = new Map(),
        processedLinks = [];

    const createVideoPanel = () => {
        iframe = document.createElement("iframe");
        closeDot = document.createElement("div");
        closeLogo = document.createElement("img");
        dotContainer = document.createElement("div");

        controlBar = document.createElement("div");
        iframeContainer = document.createElement("div");

        iframe.className = "instantYoutubeEmbeddedVideo";
        controlBar.className = "instantYoutubeControlBar";
        dotContainer.className = "instantYoutubeDotContainer";
        closeDot.className = "instantYoutubeCloseDot";
        closeLogo.className = "closeLogo";
        iframeContainer.className = "instantYoutubeVideoContainer";
        closeLogo.className = "closeLogo";
        closeLogo.src = Browser.extension.getURL('images/closeLogo.png');

        closeDot.appendChild(closeLogo);
        dotContainer.appendChild(closeDot);
        controlBar.appendChild(dotContainer);
        iframeContainer.appendChild(controlBar);
        iframeContainer.appendChild(iframe);

        iframe.setAttribute("title", "Video player");
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("allow", "accelerometer; autoplay; " +
            "clipboard-write; encrypted-media; gyroscope; picture-in-picture");
        iframe.setAttribute("allowfullscreen", "");

        setVideoFrameBoundAsBefore();

        closeDot.onmouseover = () => {
            closeLogo.style.display = "block";
        }

        closeDot.onmouseleave = () => {
            closeLogo.style.display = "none";
        }

        closeDot.onclick = removeVideo;

        controlBar.onmousedown = (event) => {
            mouseDown = true;
            offset = [
                iframeContainer.offsetLeft - event.clientX,
                iframeContainer.offsetTop - event.clientY
            ];
        }

        controlBar.onmouseup = () => {
            mouseDown = false;
        }
    }

    window.addEventListener('mousemove', (event) => {
        if (mouseDown) {
            mousePosition = {
                x: event.clientX,
                y: event.clientY
            };
            iframeContainer.style.left =
                (mousePosition.x + offset[0]) + 'px';
            iframeContainer.style.top =
                (mousePosition.y + offset[1]) + 'px';
        }
    }, true);    

    const makeVideo = (src) => {
        iframe.setAttribute("src", src);
        document.body.insertBefore(iframeContainer,
            document.body.childNodes[0]);
        
        if (iframeContainer.getBoundingClientRect().height < 30)
            iframeContainer.style.height = "50%";
    }

    const saveVideoFrame = (resolve) => {
        Browser.storage.sync.set({
            "videoFrameBound": JSON.stringify(
                iframeContainer.getBoundingClientRect()
            )
        }).then(resolve);
    }

    const setVideoFrameBoundAsBefore = () => {
        Browser.storage.sync.get(['videoFrameBound']).then(function (info) {
            let bound;

            if (info && info.videoFrameBound)
                bound = JSON.parse(info.videoFrameBound)

            if (bound && bound.height > 30) {
                iframeContainer.style.top = bound.top.toString() + "px";
                iframeContainer.style.bottom = bound.bottom.toString() + "px";
                iframeContainer.style.height = bound.height.toString() + "px";
                iframeContainer.style.width = bound.width.toString() + "px";
                iframeContainer.style.left = bound.left.toString() + "px";
                iframeContainer.style.right = bound.right.toString() + "px";
            }
        });
    }

    const isSupportedVideoLink = (videoLink) => {
        return videoLink.href.indexOf("https://www.youtube.com/watch") === 0
            && !videoLink.href.includes("t=")
            || videoLink.href.indexOf("https://www.bilibili.com") === 0
            && videoLink.href.includes("video") ||
            videoLink.href.includes("m.bilibili.com") &&
            videoLink.href.indexOf("https://m.bilibili.com") === 0
            && videoLink.href.includes("video");
    }

    const insertPlayButtons = () => {
        if (document.getElementsByClassName("instantYoutubeViewCount").length === 0 &&
            !document.location.href.includes("youtube.com") &&
            !document.location.href.includes("bilibili.com")) {
            videoLinks = Array.from(document.querySelectorAll("a"));

            let urls = videoLinks.reduce(function (result, videoLink) {
                if (isSupportedVideoLink(videoLink)) {
                    if (!result.includes(videoLink.href) || videoLink.querySelector("img")) {
                        let container = document.createElement("div");
                        container.className = "instantYoutubeButtonContainer";

                        let shadowRoot = container.attachShadow({ mode: 'open' });
                        shadowRoot.innerHTML = `<style>
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

                        let button = document.createElement("div");
                        button.className = "instantYoutubeWatchButton";
                        button.innerHTML = `<svg fill="#555555" viewBox="0 0 24 24">
                    <path d="M10 16.5l6-4.5-6-4.5v9zM5 20h14a1 1 0 0 0 1-1V5a1 1 0 0 
                    0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1zm14.5 2H5a3 3 0 0 1-3-3V4.4A2.4 2.4 
                    0 0 1 4.4 2h15.2A2.4 2.4 0 0 1 22 4.4v15.1a2.5 2.5 0 0 1-2.5 2.5"></path>
                    </svg>`;

                        shadowRoot.appendChild(button);
                        button.onclick = (e) => {
                            e.preventDefault();
                            e.stopImmediatePropagation();
                            buttonClickHandler(videoLink, button);
                        }

                        if (!videoLink.querySelector("img") ||
                            videoLinks.filter(link => link.href === videoLink.href).length ===
                            videoLinks.filter(link => link.href === videoLink.href
                                && link.querySelector("img")).length
                            || window.location.href.includes("duckduckgo")) {

                            videoLink.parentNode.insertBefore(container, videoLink.nextSibling);
                            result.push(videoLink.href);
                            logoUrlMap.set(videoLink, container);
                            urlButtonMap.set(videoLink.href, { "videoLink": videoLink, "button": button });
                        }
                    }
                }
                return result;
            }, []);

            if (!document.location.href.includes("www.youtube.com"))
                Browser.runtime.sendMessage({
                    type: "viewCount",
                    urls: urls
                });
        }
    }

    const changeVideoTime = (url) => {
        url = url.split("&t=");

        Browser.runtime.sendMessage({
            type: "changeVideoTime",
            url: url[0],
            time: url.length > 1 ? url[1] : 0
        });
    }

    const buttonClickHandler = (videoLink, button) => {
        let src, href = videoLink.href;

        if (href.includes("youtube")) {
            src = href.split("&")[0];
            src = src.replace("watch?v=", "embed/") + "?autoplay=1";

            if (document.getElementsByClassName(
                "instantYoutubeVideoContainer").length !== 0
                && src === iframe.src) return;

            button.firstChild.style.fill = "#DD0000";
        } else {
            if (href.includes("av")) {
                src = "//player.bilibili.com/player.html?aid=" + href.split("av")[1].split("/")[0];
            } else {
                if (href.includes("?"))
                    href = href.split("?")[0];
                src = href.split("/");
                src = "//player.bilibili.com/player.html?bvid="
                    + src[src.indexOf("video") + 1];
            }
            button.firstChild.style.fill = "rgb(0, 160, 215)";
        }

        if (currentPlayButton)
            currentPlayButton.firstChild.style.fill = "";

        currentPlayButton = button;

        makeVideo(src);
    }

    const keyMomentsHandler = () => {
        new MutationObserver(function () {
            try {
                let videoLinks = Array.from(document.querySelectorAll("a"));
                for (let i = 0; i < videoLinks.length; i++) {
                    let videoLink = videoLinks[i];

                    if (processedLinks.includes(videoLink)) return;
                    else processedLinks.push(videoLink);

                    if (videoLink.href.indexOf("https://www.youtube.com/watch") === 0
                        && videoLink.href.includes("t=")) {
                        let href = videoLink.href;

                        videoLink.onclick = (e) => {
                            e.preventDefault();
                            e.stopImmediatePropagation();

                            /* Google search could change href after clicking in Firefox */
                            videoLink.href = href;

                            let url = href.split("&t")[0],
                                urlButton = urlButtonMap.get(url),

                                /* Will change after buttonClickHandler */
                                previousIframeSrc = iframe.src;

                            buttonClickHandler(urlButton.videoLink, urlButton.button);

                            let timeout = previousIframeSrc && previousIframeSrc.includes(url.split("v=")[1]) ? 0 : 1000;
                            window.setTimeout(() => {
                                changeVideoTime(videoLink.href)
                            }, timeout);
                        }
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }).observe(document, { childList: true, subtree: true });
    }

    const removeVideo = () => {
        if (document.getElementsByClassName(
            "instantYoutubeVideoContainer").length > 0) {
            saveVideoFrame(() => {
                closeLogo.style.display = "none";
                iframe.src = null;
                iframeContainer.parentNode.removeChild(iframeContainer);
            });
        }
    }

    window.addEventListener('beforeunload', () => {
        removeVideo();
    });

    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape")
            removeVideo();
    });

    const insertVideoViewCount = (message) => {
        if (message.type === "viewCount") {
            for (let videoLink of videoLinks) {
                if (videoLink.href === message.url &&
                    message.viewCount !== undefined &&
                    message.viewCount !== null) {

                    let viewCount = document.createElement("div");
                    viewCount.className = "instantYoutubeViewCount";
                    viewCount.innerHTML = message.viewCount;

                    let container = logoUrlMap.get(videoLink);
                    if (container) {
                        logoUrlMap.delete(videoLink);
                        container.shadowRoot.appendChild(viewCount);
                    }
                }
            }
        }
    }

    Browser.runtime.onMessage.addListener(insertVideoViewCount);

    const main = () => {
        createVideoPanel();
        insertPlayButtons();
        keyMomentsHandler();
    }

    main();

    window.onload = () => {
      var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
      var eventer = window[eventMethod];
      var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

      eventer(messageEvent, function(e) {
        if (e.message === 'removeVideo' || e.data === 'removeVideo')
          removeVideo();
      },false);

      if (document.getElementsByClassName(
          "instantYoutubeButtonContainer").length === 0)
          insertPlayButtons();
    }

    window.setInterval(() => {
      if (!Util.isSelectable(document.activeElement) && window.getSelection().toString().length === 0) {
        iframe.contentWindow.postMessage({'focus': true}, '*');
      }
    }, 1000);
})();
