const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        clean: true
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "public/index.html"
        }),
        new WasmPackPlugin({
            crateDirectory: path.resolve(__dirname, ".")
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'public', to: '', globOptions: { ignore: ["**/index.html"] } },
                { from: 'models', to: 'models' },
                { from: 'shaders', to: 'shaders' }
            ],
        })
    ],
    performance: { hints: false },
    mode: 'development',
    experiments: {
        asyncWebAssembly: true
    }
};
