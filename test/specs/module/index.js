define('specs/module/index.js', [
    './define/task.js',
    'test.js'
], function (require, exports, module) {
    var test = require('test.js');

    module.exports = test.taskList('Module', [
        require('./define/task.js')
    ]);
});