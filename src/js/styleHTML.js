export const videoPanelStyle = `
<style> 
  :host {
    background-color: transparent;
    position: fixed;
    text-align: center;
    width: 40%;
    height: 50%;
    min-width: 150px;
    top: 20%;
    left: 50%;
    z-index: 2147483647;
  }
  
  .instantYoutubeVideoContainer {
    width: calc(100% - 40px);
    height: calc(100% - 40px);
    margin: 20px;
    min-width: 110px;
    border-radius: 8px;
    background-color: black;
    overflow: hidden;
    z-index: 2147483645;
    display: flex;
  }
  
  .instantYoutubeEmbeddedVideo {
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
  }
  
  .instantYoutubeControlBar {
    width: inherit;
    height: 20px;
    display: flex;
    position: absolute;
  }
  
  .instantYoutubeControlBar:hover {
    cursor: -webkit-grabbing;
    cursor: grabbing;
  }
  
  .instantYoutubeDotContainer {
    height: 100%;
    cursor: default;
  }
  
  .instantYoutubeCloseDot {
    height: 10px;
    width: 10px;
    border-radius: 50%;
    margin: 8px 0px 0px 8px;
    background-color: red;
    display: flex;
    align-items: center;
    opacity: 50%;
  }
  
  .instantYoutubeCloseDot:hover {
    opacity: 100%;
  }
  
  .closeLogo {
    width: 10px;
    height: 10px;
    display: none;
  }
  </style>
  `;

export const buttonContainerHTML = `
<style>
    :host {
        color: #444;
        display: flex;
        font-size: 15px;
        align-items: center;
        height: 24px;
        z-index: 2147483645;
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
        color: #555;
        text-align: center;
        /*margin-top: 2px;*/
    }
</style>`;

export const buttonHTML =
  `<svg fill='#555555' viewBox='0 0 24 24'>
<path d='M10 16.5l6-4.5-6-4.5v9zM5 
20h14a1 1 0 0 0 1-1V5a1 1 0 0 
0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 
1 1zm14.5 2H5a3 3 0 0 1-3-3V4.4A2.4 2.4 
0 0 1 4.4 2h15.2A2.4 2.4 0 0 1 22 
4.4v15.1a2.5 2.5 0 0 1-2.5 2.5'>
</path>
</svg>`;

export const playButtonHTML =
  `
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