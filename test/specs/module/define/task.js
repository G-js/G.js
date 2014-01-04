define('specs/module/define/task.js', ['test.js'], function (require, exports, module) {
    var test = require('test.js');

    module.exports = test.task('AMD', function (done) {
        require.async(['./a', './b', './c', './d', './e', './f'], function (a, b, c, d, e, f) {
            test.assert(a.name === 'a', 'define(id, obj);');
            test.assert(b.name === 'b', 'define(id, deps, obj);');
            test.assert(c.name === 'c', 'define(id, function () {return obj;});');
            test.assert(d.name === 'd', 'define(id, deps, function () {return obj;});');
            test.assert(e.name === 'e', 'define(id, function (require, exports) { exports.key = value});');
            test.assert(f.name === 'f', 'define(id, function (require, exports, module) {module.exports = obj;});');
            done();
        });
    });
});