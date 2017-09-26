// 这里是在webpack中的vue-loader的具体配置
// 默认只有两项，sourceMap和postcss的配置

const utils = require('./utils'),
    config = require('../config'),
    isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    loaders: utils.cssLoaders({
        sourceMap: isProduction
            ? config.build.productionSourceMap
            : config.dev.cssSourceMap,
        extract: isProduction,
    }),
    postcss: [
        require('autoprefixer')({
            browsers: ['last 2 versions'],
        }),
    ],
};
