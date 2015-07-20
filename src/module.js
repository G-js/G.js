(function ( global, G, util ) {
    var STATUS = {
        'ERROR'     : -2,   // The module throw an error while compling
        'FAILED'    : -1,   // The module file's fetching is failed
        'FETCHING'  : 1,    // The module file is fetching now.
        'FETCHED'   : 2,    // The module file has been fetched.
        'SAVED'     : 3,    // The module info has been saved.
        'READY'     : 4,    // The module is waiting for dependencies
        'COMPILING' : 5,    // The module is in compiling now.
        'PAUSE'     : 6,    // The moudle's compling is paused()
        'COMPILED'  : 7     // The module is compiled and module.exports is available.
    };

    var config = G.config();
    var guid   = 0;

    function use ( deps, cb, context ) {
        var module = Module.getOrCreate( 'module_' + (guid++) );
        var id     = module.id;
        var defer  = G.Deferred();

        module.isAnonymous = true;

        if (!Array.isArray(deps)) {
            deps = [deps];
        }

        Module.save( id, deps, cb, context );

        Module.defers[id]
            .done(function () {
                defer.resolve.apply(defer, module.dependencies.map(function (dep) {
                    return dep.exports;
                }));
            })
            .fail(function (err) {
                defer.reject(err);
            });

        return defer.promise();
    }

    G.use = function (deps, cb) {
        return use( deps, cb, window.location.href );
    };

    global.define = function ( id, deps, fn ) {
        if (typeof id !== 'string') {
            throw new Error( 'module.id must be a string' );
        }

        if (!fn) {
            fn = deps;
            deps = [];
        }

        delete G.Loader.buffer[ id ];

        if (Module.cache[ id ] && Module.cache[ id ].status >= STATUS.SAVED) {
            return;
        }

        return Module.save( id, deps, fn, id );
    };

    function Require ( context ) {
        context = context || window.location.href;

        function require ( id ) {
            id = require.resolve( id );
            if ( !Module.cache[id] || Module.cache[id].status !== STATUS.COMPILED ) {
                throw new Error( 'Module not found:' + id );
            }
            return Module.cache[id].exports;
        }

        require.resolve = function ( id ) {
            if ( config.alias && config.alias[id] ) {
                return config.alias[id];
            }

            if ( Module.cache[id] ) {
                return id;
            }

            if ( util.path.isAbsolute( id ) ) {
                return id;
            }

            if ( util.path.isRelative( id ) ) {
                id = util.path.realpath( util.path.dirname( context ) + id );
                var baseUrl = G.config('baseUrl');
                if (id.indexOf(baseUrl) === 0) {
                    id = id.replace(baseUrl, '');
                }
            }
            return (/(\.[a-z]*$)|([\?;].*)$/).test(id) ? id : id + '.js';
        };

        require.async = function (deps, cb) {
            return use( deps, cb, context );
        };

        // TODO: implement require.paths

        require.cache = Module.cache;

        return require;
    }

    G.Require = Require;

    var Module = {};

    Module.cache = {};
    Module.defers = {};
    Module.STATUS = STATUS;

    Module.getOrCreate = function (id) {
        if ( !Module.cache[id] ) {
            Module.cache[id]  = {
                id           : id,
                status       : 0,
                dependencies : []
            };
            Module.defers[id] = G.Deferred();
        }
        return Module.cache[id];
    };

    Module.compile = function ( module ) {
        var deps, exports;
        module.status = STATUS.READY;

        if ( typeof module.factory === 'function' ) {
            module.status = STATUS.COMPILING;
            try {
                // G.use( [dep1, dep2, ...], function (dep1, dep2, ...) {} );
                if ( module.isAnonymous ) {
                    deps = module.dependencies.map( function (dep) {
                        return dep.exports;
                    });
                    module.exports = module.factory.apply( window, deps );
                }
                // define( id, deps, function (require, exports, module ) {} );
                else {
                    module.exports = {};

                    module.async = function () {
                        module.status = STATUS.PAUSE;
                        return function () {
                            module.status = STATUS.COMPILED;
                            Module.defers[module.id].resolve(module.exports);
                        };
                    };

                    Module.defers[module.id].always( function () {
                        delete module.async;
                    });

                    exports = module.factory.call( window, new Require( module.id ), module.exports, module );

                    if (exports) {
                        module.exports = exports;
                    }
                }
            } catch (ex) {
                module.status = STATUS.ERROR;
                Module.fail( module, ex );
                throw ex;
            }
        } else {
            module.exports = module.factory;
        }

        if ( module.status !== STATUS.PAUSE ) {
            module.status = STATUS.COMPILED;
            Module.defers[module.id].resolve(module.exports);
        }
    };

    Module.fail  = function ( module, err ) {
        Module.defers[module.id].reject(err);
        throw err;
    };

    Module.save = function ( id, deps, fn, context ) {
        var module = Module.getOrCreate( id );
        var require = new Require( context );

        var deps = deps.map( function (dep) {
            return Module.getOrCreate( require.resolve( dep ) );
        });

        module.dependencies = deps;
        module.factory      = fn;
        module.status       = STATUS.SAVED;

        deps = deps.map( function ( dep ) {
            if (dep.status < STATUS.FETCHING) {
                dep.status = STATUS.FETCHING;

                dep.url = util.path.map( util.path.idToUrl( dep.id ) );

                G.Loader.buffer[dep.id] = dep;
            }

            return Module.defers[dep.id];
        } );

        G.when( deps )
            .done( function () {
                Module.compile( module );
            } )
            .fail( function ( err ) {
                Module.fail( module, err );
            } );

        // 将`G.Loader.dispatch`延迟到`script`标签的onLoad之后，
        // 以避免一个`script`标签内多个`define`带来的依赖重复加载问题
        // https://github.com/amdjs/amdjs-api/blob/master/AMD.md#transporting-more-than-one-module-at-a-time-
        setTimeout(function () {
            G.Loader.dispatch();
        }, 0);
    };

    Module.remove = function (id) {
        var module = Module.getOrCreate(id);
        delete Module.cache[module.id];
        delete Module.defers[module.id];
    };

    G.Module = Module;

}) (window, G, G.util);
