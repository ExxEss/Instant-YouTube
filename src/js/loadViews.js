(function () {
    let videoLinks = document.querySelectorAll('a');
    let pattern = /(200\d|20[0-2][0-9])/;

    for (let videoLink of videoLinks) {
        if (videoLink.href.includes("www.youtube.com/watch")) {
            if (videoLink.querySelector('img')) {
                while (videoLink.innerText.search(pattern) === -1) {
                    videoLink = videoLink.parentNode;
                }
            } else if (videoLink.innerText.search(pattern) === -1)
                continue;

            let dateElement = searchDateElement(videoLink);
            if (dateElement)

                dateElement.innerText = dateElement.innerText.includes('·')
                    ? dateElement.innerText + " 2,860,718,282 views  "
                    : dateElement.innerText + " · 2,860,718,282 views  ";

        }
    }

    function searchDateElement(element) {
        if (element.childElementCount === 0
            || element.childElementCount === 1
            && element.firstChild.innerText
            && element.firstChild.innerText.search(pattern) === -1)
            return element;

        for (let child of element.childNodes) {
            let text = child.innerText;

            if (text && text.search(pattern) !== -1) {
                return searchDateElement(child);
            }
        }
    }
})();

