module.exports = function(grunt) {
    grunt.initConfig({
        src: "src",
        dest: "dest",
        jshint: {
            options: {
                "browser": true,
                "scripturl": true
            },
            all: [
                "src/boot.js",
                "src/deferred.js",
                "src/main.js",
                "src/util.js",
                "test"
            ]
        },
        concat: {
            dist: {
                files: {
                    'dist/g.js': [
                        "src/es5-safe.js",
                        "src/json2.js",
                        "src/boot.js",
                        "src/config.js",
                        "src/util.js",
                        "src/deferred.js",
                        "src/loader.js",
                        "src/module.js",
                        "src/loader/amd.js",
                        "src/loader/css.js"
                    ],
                    'dist/g-modern.js': [
                        "src/boot.js",
                        "src/config.js",
                        "src/util.js",
                        "src/deferred.js",
                        "src/loader.js",
                        "src/module.js",
                        "src/loader/amd.js",
                        "src/loader/css.js"
                    ]
                }
            },
        },
        uglify: {
            "g.js": {
                "files": [
                    {
                        "dest": "dist/g.min.js",
                        "src": "dist/g.js"
                    },
                    {
                        "dest": "dist/g-modern.min.js",
                        "src": "dist/g-modern.js"
                    }
                ]
            }
        }
    });

    // load npm tasks
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
};