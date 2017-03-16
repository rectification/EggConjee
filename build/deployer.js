const Transform = require('stream').Transform,
    setPrototypeOf = require('util').inherits,
    spawn = require('child_process').spawn,
    path = require('path'),
    fs = require('fs'),
    chalk = require('chalk'),
    // 默认文件夹
    opt = { cwd: path.join(__dirname, '../.deploy_git/') };

//缓存类
function CacheStream() {
    Transform.call(this);
    this._cache = [];
}
CacheStream.prototype = {
    _transform(chunk, enc, callback) {
        const buf = chunk instanceof Buffer ? chunk : new Buffer(chunk, enc);

        this._cache.push(buf);
        this.push(buf);
        callback();
    },
    destroy() {
        this._cache.length = 0;
    },
    getCache(encoding) {
        //取出所有信息
        const buf = Buffer.concat(this._cache);
        this.destroy();

        if (!encoding) return buf;
        return buf.toString(encoding).trim();
    }
};
setPrototypeOf(CacheStream, Transform);

//git操作入口
function git(...args) {
    if (args[0] === 'init') {
        //初始化，配置参数
        Object.assign(opt, args[1] || {});
        //.git文件夹不存在，那么就需要初始化git
        if (!fs.existsSync(path.join(opt.cwd, '.git'))) {
            return promiseSpawn('git', ['init'], opt);
        } else {
            return Promise.resolve();
        }
    } else {
        //子进程运行git命令
        return (() => promiseSpawn('git', args, opt));
    }
}
//子进程信息的字体渲染
function log(message) {
    if (!message) {
        return;
    }
    const ans = message.replace(/ changed,?/, chalk.green(' changed') + ',')
        .replace(/( insertions?\(\+\))/, chalk.yellow('$1'))
        .replace(/( deletions?\(-\))/, chalk.red('$1'))
        .replace(/\n create/g, chalk.green('\n create'))
        .replace(/\n rewrite/g, chalk.blue('\n rewrite'))
        .replace(/\n delete/g, chalk.red('\n delete'));

    console.log(ans);
}
//异步子进程
function promiseSpawn(command, args, options) {
    if (!command) {
        throw new TypeError('command is required!');
    }

    if (!options && args && !Array.isArray(args)) {
        options = args;
        args = [];
    }

    args = args || [];
    options = options || {};

    return new Promise(function(resolve, reject) {
        const stdoutCache = new CacheStream(),
            stderrCache = new CacheStream(),
            task = spawn(command, args, options),
            encoding = options.hasOwnProperty('encoding')
                ? options.encoding
                : 'utf8';

        //流管道连接
        task.stdout.pipe(stdoutCache);
        task.stderr.pipe(stderrCache);

        //子进程结束
        task.on('close', function() {
            log(stdoutCache.getCache(encoding));
            resolve();
        });
        //子进程发生错误
        task.on('error', function(code) {
            const e = new Error(stderrCache.getCache(encoding));
            e.code = code;
            reject(e);
        });
    });
}

module.exports = git;
