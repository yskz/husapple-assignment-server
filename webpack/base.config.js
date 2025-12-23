const path = require('path');

const srcDir = path.join(__dirname, "../src");
const distDir = path.join(__dirname, "../build");

module.exports = {
    target: 'node',
    context: srcDir,
    entry: {
        server: path.resolve("src", "index.js")
    },
    output: {
        filename: "[name].js",
		path: distDir,
		libraryTarget: 'commonjs2'
    },
    resolve: {
        extensions: [".js", ".json"],
        alias: {
            "@": path.join(__dirname, "/src/"),
        },
    },
    node: {
        __dirname: false,
        __filename: false,
    }
};
