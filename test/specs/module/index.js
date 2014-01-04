define('specs/module/index.js', [
    './define/task.js'
], function (require, exports, module) {
    var test = require('test.js');

    module.exports = test.taskList('Loaders', [
        require('./define/task.js')
    ]);
});