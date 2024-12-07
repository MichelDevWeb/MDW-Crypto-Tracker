const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  pages: {
    index: {
      entry: "src/main.js",
      template: "public/index.html",
      filename: "index.html",
    },
  },
  filenameHashing: false,
  productionSourceMap: false,
});
