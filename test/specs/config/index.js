define('specs/config/index.js', [
    './alias/task.js',
    './baseUrl/task.js',
    'test.js'
], function (require, exports, module) {
    var test = require('test.js');

    module.exports = test.taskList('Config', [
        require('./alias/task.js'),
        require('./baseUrl/task.js')
    ]);
});