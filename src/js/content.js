import "../css/style.css";

(function () {
    let isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

    let browser = require("webextension-polyfill");
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
        logoUrlMap = new Map();

    function createVideoPanel() {
        iframe = document.createElement("iframe");
        closeDot = document.createElement("div");
        closeLogo = document.createElement("img");
        dotContainer = document.createElement("div");

        controlBar = document.createElement("div");
        iframeContainer = document.createElement("div");

        iframe.className = "gooTubeEmbeddedVideo";
        controlBar.className = "gooTubeControlBar";
        dotContainer.className = "gooTubeDotContainer";
        closeDot.className = "gooTubeCloseDot";
        closeLogo.className = "closeLogo";
        iframeContainer.className = "gooTubeVideoContainer";
        closeLogo.className = "closeLogo";
        closeLogo.src = browser.extension.getURL('images/closeLogo.png');


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

        closeDot.onclick = () => {
            saveVideoFrame();
            closeLogo.style.display = "none";
            iframeContainer.parentNode.removeChild(iframeContainer);
        };

        controlBar.onmousedown = (e) => {
            mouseDown = true;
            offset = [
                iframeContainer.offsetLeft - e.clientX,
                iframeContainer.offsetTop - e.clientY
            ];
        }

        controlBar.onmouseup = () => {
            mouseDown = false;
        }
    }

    document.addEventListener('mousemove', function (event) {
        if (mouseDown) {
            mousePosition = {
                x: event.clientX,
                y: event.clientY
            };
            iframeContainer.style.left = (mousePosition.x + offset[0]) + 'px';
            iframeContainer.style.top = (mousePosition.y + offset[1]) + 'px';
        }
    }, true);

    function saveVideoFrame() {
        if(!isChrome || isChrome && browser.app.isInstalled){
            browser.storage.sync.set({
                "videoFrameBound": JSON.stringify(iframeContainer.getBoundingClientRect())
            });
        }
    }

    function setVideoFrameBoundAsBefore() {
        browser.storage.sync.get(['videoFrameBound']).then(function (info) {
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

    function main() {
        createVideoPanel();

        if (document.getElementsByClassName("gootubeViewCount").length === 0 &&
            // !document.location.href.includes("youtube.com") &&
            !document.location.href.includes("bilibili.com")) {
            videoLinks = Array.from(document.querySelectorAll("a"));

            let urls = videoLinks.reduce(function (result, videoLink) {
                if (videoLink.href.indexOf("https://www.youtube.com/watch") === 0
                    && !videoLink.href.includes("t=")
                    || videoLink.href.indexOf("https://www.bilibili.com") === 0
                    && videoLink.href.includes("video") ||
                    videoLink.href.includes("m.bilibili.com") &&
                    videoLink.href.indexOf("https://m.bilibili.com") === 0
                    && videoLink.href.includes("video")) {

                    if (!result.includes(videoLink.href) || videoLink.querySelector("img")) {
                        let container = document.createElement("div");
                        container.className = "gooTubeButtonContainer";

                        let shadowRoot = container.attachShadow({mode: 'open'});
                        shadowRoot.innerHTML = `<style>
                                                :host {
                                                    display: flex;
                                                    color: #444444;
                                                    font-size: 15px;
                                                    align-items: center;
                                                    height: 24px;
                                                }
                                            
                                               .gooTubeWatchButton {
                                                    height: 20px;
                                                    width: 20px;
                                                    cursor: pointer;
                                                    border: none;
                                                    margin-right: 8px;
                                                    padding: 1px 0 1px 0;
                                                    display: flex;
                                                    align-items: center;
                                               }
                                               
                                               .gootubeViewCount {
                                                    color: #555555;
                                                    text-align: center;
                                                    /*margin-top: 2px;*/
                                               }
                                            </style>`;

                        let button = document.createElement("div");
                        button.className = "gooTubeWatchButton";
                        button.innerHTML = `<svg fill="#555555" viewBox="0 0 24 24">
                    <path d="M10 16.5l6-4.5-6-4.5v9zM5 20h14a1 1 0 0 0 1-1V5a1 1 0 0 
                    0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1zm14.5 2H5a3 3 0 0 1-3-3V4.4A2.4 2.4 
                    0 0 1 4.4 2h15.2A2.4 2.4 0 0 1 22 4.4v15.1a2.5 2.5 0 0 1-2.5 2.5"></path>
                    </svg>`;

                        shadowRoot.appendChild(button);

                        button.onmouseover = () => {
                        }
                        button.onmouseleave = () => {
                        }

                        button.onclick = (e) => {
                            e.preventDefault();
                            e.stopImmediatePropagation();

                            let src,
                                href = videoLink.href;

                            if (currentPlayButton)
                                currentPlayButton.firstChild.style.fill = "";

                            currentPlayButton = button;

                            if (href.includes("youtube")) {
                                button.firstChild.style.fill = "#DD0000";
                                src = href.split("&")[0];
                                src = src.replace("watch?v=", "embed/") + "?autoplay=1";
                            } else {
                                button.firstChild.style.fill = "blue";
                                src = href.split("/");
                                src = "//player.bilibili.com/player.html?bvid="
                                    + src[src.indexOf("video") + 1];
                            }

                            iframe.setAttribute("src", src);
                            document.body.insertBefore(iframeContainer, document.body.childNodes[0]);

                            if (iframeContainer.getBoundingClientRect().height < 30) {
                                iframeContainer.style.height = "50%";
                            }
                        }

                        if (!videoLink.querySelector("img") ||
                            videoLinks.filter(link => link.href === videoLink.href).length ===
                            videoLinks.filter(link => link.href === videoLink.href
                                && link.querySelector("img")).length) {

                            videoLink.parentNode.insertBefore(container, videoLink.nextSibling);
                            result.push(videoLink.href);
                            logoUrlMap.set(videoLink, container);
                        }
                    }
                }
                return result;
            }, []);

            if (!document.location.href.includes("www.youtube.com"))
                browser.runtime.sendMessage({
                    type: "viewCount",
                    urls: urls
                });
        }
    }

    main();

    window.addEventListener('beforeunload', function () {
        if (document.getElementsByClassName("gooTubeVideoContainer").length > 0)
            saveVideoFrame();
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && iframeContainer.parentNode) {
            iframe.src = null;
            saveVideoFrame();
            iframeContainer.parentNode.removeChild(iframeContainer);
        }
    }, true);

    browser.runtime.onMessage.addListener(
        function (message) {
            if (message.type === "viewCount") {
                for (let videoLink of videoLinks) {
                    if (videoLink.href === message.url &&
                        message.viewCount !== undefined &&
                        message.viewCount !== null) {

                        let viewCount = document.createElement("div");
                        viewCount.className = "gootubeViewCount";
                        viewCount.innerHTML = message.viewCount;

                        let container = logoUrlMap.get(videoLink);

                        if (container) {
                            logoUrlMap.delete(videoLink);
                            container.shadowRoot.appendChild(viewCount);
                        }
                    }
                }
            }
        });
})();
