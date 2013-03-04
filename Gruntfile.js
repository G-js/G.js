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
                "src/loader.js",
                "src/util.js"
            ]
        },
        concat: {
            dist: {
                files: {
                    'dist/g.js': [
                        "src/es5-safe.js",
                        "src/json2.js",
                        "src/boot.js",
                        "src/util.js",
                        "src/deferred.js",
                        "src/loader.js"
                    ],
                    'dist/g-modern.js': [
                        "src/boot.js",
                        "src/util.js",
                        "src/deferred.js",
                        "src/loader.js"
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