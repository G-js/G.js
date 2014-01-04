G.config({
    alias: {
        'foo/bar': 'specs/config/alias/path/to/foo/bar.js',
        'pub': 'specs/config/alias/path/to/pub.js',
        'sub.js': 'specs/config/alias/path/to/sub.js'
    }
});

define('specs/config/alias/task.js', ['test.js'], function(require, exports, module) {
    var test   = require('test.js');

    module.exports = test.task('alias', function (done) {
        require.async(['foo/bar', 'pub', 'sub.js'], function (fooBar, pub, sub) {
            test.assert(fooBar.name === 'foo/bar', G.config('alias')['foo/bar']);
            test.assert(pub.name === 'pub', G.config('alias').pub);
            test.assert(sub.name === 'sub', G.config('alias')['sub.js']);

                    // overwrite alias;
            G.config().alias.pub = 'specs/config/alias/path/to/sub.js';

            require.async('pub', function (pub) {
                test.assert(pub.name === 'sub', 'Overwrite alias is not recommend');
                done();
            });
        });
    });
});