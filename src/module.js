// Thanks To:
//      - My girlfriend
//      - http://github.com/seajs/seajs

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
    var holdRequest = 0;

    function use ( deps, cb ) {
        var module = Module.getOrCreate( 'module_' + (guid++) );
        var id     = module.id;

        module.isAnonymous = true;

        Module.save( id, deps, cb, this.context );

        return Module.defers[id].promise();
    }

    G.use = function (deps, cb) {
        return use.call({context: window.location.href}, deps, cb);
    };

    global.define = function ( id, deps, fn ) {
        if (typeof id !== 'string') {
            throw new Error( 'ID must be a string' );
        }
        if (!fn) {
            fn = deps;
            deps = [];
        }

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
            return use.call({context: context}, deps, cb);
        };

        // TODO: implement require.paths

        require.cache = Module.cache;

        return require;
    }

    G.Require = Require;

    var Module = {};

    Module.cache = {};
    Module.defers = {};
    Module.queue = [];
    Module.holdedRequest = [];
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

    Module.wait  = function ( module ) {
        var deps = module.dependencies.map( function ( dep ) {
            return Module.defers[dep.id];
        } );

        G.when( deps )
            .done( function () {
                Module.compile( module );
            } )
            .fail( function (msg) {
                Module.fail( module, new Error( msg ) );
            } );
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

    Module.fetch = function ( module ) {
        var loader = G.Loader.match( module.id ) || G.Loader.match('.js');

        module.url = util.path.idToUrl( module.id );

        loader.call( {
            fail: function ( err ) {
                Module.fail( module, err );
            },
            compile: function () {
                Module.compile( module );
            },
            onLoad: function () {
                if ( Module.queue.length ) {
                    Module.queue
                        .filter(function (module) {
                            return module.status < STATUS.FETCHING;
                        })
                        .forEach( Module.fetch );
                    Module.queue = [];
                }
            },
            holdRequest: function () {
                holdRequest ++;
            },
            flushRequest: function () {
                holdRequest --;
                Module.holdedRequest
                    .filter(function ( module ) {
                        return module.status < STATUS.FETCHING;
                    })
                    .forEach( Module.fetch );

                Module.holdedRequest = [];
            }
        }, module );
    };

    Module.save = function ( id, deps, fn, context ) {
        var module = Module.getOrCreate( id );

        deps = resolveDeps( deps, context );

        module.dependencies = deps;
        module.factory      = fn;
        module.status       = STATUS.SAVED;

        Module.wait( module );
    };

    Module.remove = function (id) {
        var module = Module.getOrCreate(id);
        delete Module.cache[module.id];
        delete Module.defers[module.id];
    };

    // convert dep string to module object, and fetch if not loaded
    function resolveDeps ( deps, context ) {
        var require = new Require( context );

        if (!Array.isArray(deps)) {
            deps = [deps];
        }

        var modules = deps.map( function (dep) {
            return Module.getOrCreate( require.resolve( dep ) );
        });

        var toFetch = modules
            .filter(function ( m ) {
                return m.status < STATUS.FETCHING;
            });

        if (holdRequest) {
            Module.holdedRequest = Module.holdedRequest.concat( toFetch );
        } else {
            toFetch.forEach( Module.fetch );
        }

        return modules;
    }

    G.Module = Module;

}) (window, G, G.util);