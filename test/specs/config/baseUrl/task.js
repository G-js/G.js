define('specs/config/baseUrl/task.js', ['test.js'], function (require, exports, module) {
    var test = require('test.js');

    module.exports = test.task('baseUrl', function (done) {
        var baseUrl = G.config('baseUrl');
        G.config('baseUrl', module.url.replace(/task.js$/, ''));
        require.async(['path/to/a/a.js', 'b.js'], function (a, b) {
            test.assert(a.name === 'a', 'a');
            test.assert(b.name === 'b', 'b');
            G.config('baseUrl', baseUrl);
            done();
        });
    });
});