const path = require('path');

module.exports = {
    entry: {
        './src/js/content': './src/js/content.js',
        './src/js/background': './src/js/background.js',
        './src/js/adblocker': './src/js/adblocker.js',
    },

    output: {
        path: path.join(__dirname, 'dist'),
        filename: "[name].js",
        sourceMapFilename: "[name].js.map"
    },

    devtool: "eval-cheap-source-map",

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
