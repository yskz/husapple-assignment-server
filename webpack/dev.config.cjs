const baseConfig = require('./base.config.cjs');
const { merge } = require('webpack-merge');

const config = merge(baseConfig, {
    mode: "development",
    devtool: "inline-source-map"
});

module.exports = config;
