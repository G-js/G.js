define('test.js', ['meta.js'], function (require, exports) {
    var meta = require('meta.js');
    var reportBoard = document.getElementById('reportBoard');
    var failEl = document.getElementById('fail');
    var passEl = document.getElementById('pass');
    var passCount = 0;
    var failCount = 0;
    var Logger = {
        header: function (msg) {
            var h2 = document.createElement('h2');
            h2.innerHTML = msg;
            reportBoard.appendChild(h2);
        },
        subHeader: function (msg) {
            var h3 = document.createElement('h3');
            h3.innerHTML = msg;
            reportBoard.appendChild(h3);
        },
        log: function (msg) {
            var div = document.createElement('div');
            div.innerHTML = msg;
            reportBoard.appendChild(div);
        },
        pass: function (msg) {
            passEl.innerHTML = ++passCount;
            Logger.log('<span class="pass">[PASS]</span>' + msg);
        },
        fail: function (msg) {
            failEl.innerHTML = ++failCount;
            Logger.log('<span class="fail">[FAIL]</span>' + msg);
        }
    };

    function series (fns, callback) {
        function next () {
            var fn;

            if (!fns.length) {
                return callback();
            }
            fn = fns.shift();

            try {
                fn(function (err) {
                    if (err) {
                        setTimeout(function () {
                            callback(err);
                        }, 0);
                    } else {
                        setTimeout(next, 0);
                    }
                });
            } catch (ex) {
                callback(ex);
            }
        }
        setTimeout(next, 0);
    }

    exports.run = function () {
        var taskLists = meta.map(function (dir) {
            return function (next) {
                require.async(dir + '/index.js', function (taskList) {
                    taskList(function (err) {
                        next(err);
                    });
                });
            };
        });

        series(taskLists, function (err) {
            if (err) {
                Logger.log(err.message);
            } else {
                Logger.log('all done');
            }
        });
    };

    exports.taskList = function (msg, taskList) {
        return function (cb) {
            Logger.header(msg);

            series(taskList, function (err) {
                if (err) {
                    Logger.error(err.message);
                } else {
                    Logger.log(msg + ' done');
                }
                cb(err);
            });
        };
    };

    exports.task = function (msg, task) {
        return function (cb) {
            Logger.subHeader(msg);
            try {
                task(cb);
            } catch (ex) {
                Logger.error(msg);
            }
        };
    };

    exports.assert = function (assertion, msg) {
        if (assertion) {
            Logger.pass(msg);
        } else {
            Logger.fail(msg);
        }
    };
});