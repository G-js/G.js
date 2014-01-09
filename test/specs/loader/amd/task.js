define('specs/loader/amd/task.js', ['test.js'], function (require, exports, module) {
    var test = require('test.js');

    module.exports = test.task('AMD', function (done) {
        require.async(['specs/loader/amd/a.js'], function (a) {
            test.assert(a.name === 'a', 'normal module');
            require.async(['specs/loader/amd/a.cmb.js'], function () {
                require.async([
                    './a.js',
                    './b.js',
                    './c.js',
                    './d.js',
                    '../x.js',
                    '../../y.js',
                    '../../module/z.js'
                ],
                    function (a, b, c, d, x, y, z) {
                        test.assert(a.name === 'a', 'module redefine is not allow');
                        test.assert(b.name === 'b', 'normal module');
                        test.assert(c.name === 'c', 'normal module');
                        test.assert(d.name === 'd', 'normal module');
                        test.assert(x.name === 'x', 'normal module');
                        test.assert(y.name === 'y', 'normal module');
                        test.assert(z.name === 'z', 'normal module');
                        done();
                    }
                );
            });
        });
    });
});