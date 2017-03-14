// 检查当前运行环境
require('./check-versions')();
// 读取当前配置文件
const config = require('../config');
// 如果当前系统环境设置为空，那么使用config中的环境设置
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = JSON.parse(config.dev.env.NODE_ENV);
}

const // opn插件可以强制打开浏览器并跳转到指定url
    opn = require('opn'),
    path = require('path'),
    express = require('express'),
    webpack = require('webpack'),
    // 生成博客网站
    site = require('./create-site'),
    // 博客文章内存中间件
    siteMiddleware = require('./ram-middleware'),
    // http代理中间件
    proxyMiddleware = require('http-proxy-middleware'),
    // 读取dev版本配置
    webpackConfig = require('./webpack.dev.conf'),
    // 调试时运行的端口
    port = process.env.PORT || config.dev.port,
    // 是否自动打开浏览器，如果没有设置那么此项将会为false
    autoOpenBrowser = !!config.dev.autoOpenBrowser,
    // 读取http代理的配置
    // 配置详情请看：https://github.com/chimurai/http-proxy-middleware
    proxyTable = config.dev.proxyTable,
    // 生成服务器
    app = express(),
    // webpack加载编译配置并生成编译器
    compiler = webpack(webpackConfig),
    // 启动webpack编译器，并将编译好的文件保存到内存中
    devMiddleware = require('webpack-dev-middleware')(compiler, {
        publicPath: webpackConfig.output.publicPath,
        quiet: true
    }),
    // 设定热更新中间件
    hotMiddleware = require('webpack-hot-middleware')(compiler, {
        log: () => {}
    });

// 监控文件，当它们有变化时热更新至网站
compiler.plugin('compilation', (compilation) => {
    compilation.plugin('html-webpack-plugin-after-emit', (data, cb) => {
        hotMiddleware.publish({ action: 'reload' });
        cb();
    });
});

// 将proxyTable中的请求配置挂在到启动的express服务上
Object.keys(proxyTable).forEach((context) => {
    let options = proxyTable[context];
    if (typeof options === 'string') {
        options = { target: options };
    }
    app.use(proxyMiddleware(options.filter || context, options));
});

// 博客文章数据的路由中间件，以api为前缀
app.use('/api/', siteMiddleware(site));
// 静态资源路径前缀
const staticPath = path.posix.join(config.dev.assetsPublicPath, config.dev.assetsSubDirectory);
// 静态资源挂载到express服务器上
app.use(staticPath, express.static('./static'));
// 当使用history-api进行跳转的时候，使用下面的中间件来匹配资源，如果不匹配就重定向到指定地址
app.use(require('connect-history-api-fallback')());
// 将内存中编译好的文件挂载到express服务器上
app.use(devMiddleware);
// 将热更新的资源也挂载到express的服务器上
app.use(hotMiddleware);
// 设定虚拟网站地址，并设定完成后的打印出的提示信息
const uri = 'http://localhost:' + port;
devMiddleware.waitUntilValid(() => console.log('> Listening at ' + uri + '\n'));
// 监听port端口，并将此服务对外暴露
module.exports = app.listen(port, (err) => {
    if (err) {
        console.log(err);
        return (false);
    }

    // 如果不是测试环境，强制打开浏览器并跳转到开发地址
    if (autoOpenBrowser && process.env.NODE_ENV !== 'testing') {
        opn(uri);
    }
});
