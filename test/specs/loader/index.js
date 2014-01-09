define('specs/loader/index.js', [
    './amd/task.js',
    'test.js'
], function (require, exports, module) {
    var test = require('test.js');

    module.exports = test.taskList('Loader', [
        require('./amd/task.js')
    ]);
});