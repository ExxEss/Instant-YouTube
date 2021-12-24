const path = require('path');

module.exports = {
    entry: {
        './src/js/content': './src/js/content.js',
        './src/js/background': './src/js/background.js',
        './src/js/iframe': './src/js/iframe.js',
    },

    output: {
        path: path.join(__dirname, 'dist'),
        filename: "[name].js",
        sourceMapFilename: "[name].js.map"
    },

    devtool: "source-map",

    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [
                    'style-loader',
                    'css-loader'
                ],
            },
        ],
    },

    mode: 'development',
};
