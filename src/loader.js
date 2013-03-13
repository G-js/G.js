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

    var doc    = document;
    var head   = doc.head ||
                 doc.getElementsByTagName('head')[0] ||
                 doc.documentElement;
    var config = G.config();

    function use ( deps, cb ) {
        var module = Module( util.guid( 'module' ) );
        var id     = module.id;
        module.isAnonymous = true;
        deps = resolveDeps( deps, this.context );

        module.dependencies = deps;
        module.factory = cb;

        Module.wait( module );

        return Module.defers[id].promise();
    }

    G.use = function (deps, cb) {
        return use.call({context: window.location.href}, deps, cb);
    };

    var define = global.define = function ( id, deps, fn ) {
        if (typeof id !== 'string') {
            throw 'ID must be a string';
        }
        if (!fn) {
            fn = deps;
            deps = [];
        }
        return Module.save(id, deps, fn);
    };
    define.amd = {};

    function Require ( context ) {
        context = context || window.location.href;
        function require ( id ) {
            id = require.resolve( id );
            if ( !Module.cache[id] || Module.cache[id].status !== STATUS.COMPILED ) {
                throw new Error( 'This module is not found:' + id );
            }
            return Module.cache[id].exports;
        }

        require.resolve = function ( id ) {
            if ( config.alias[id] ) {
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

    // Get or Create a module object
    function Module (id) {
        if ( !Module.cache[id] ) {
            Module.cache[id]  = {
                id           : id,
                status       : 0,
                dependencies : []
            };
            Module.defers[id] = G.Deferred();
        }
        return Module.cache[id];
    }

    Module.cache = {};
    Module.defers = {};
    Module.queue = [];

    Module.wait  = function ( module ) {
        var deps = module.dependencies.map( function ( dep ) {
            return Module.defers[dep.id];
        } );
        G.when( deps )
            .done( function () {
                Module.ready( module );
            } )
            .fail( function (msg) {
                Module.fail( module, new Error( msg ) );
            } );
    };

    Module.ready = function ( module ) {
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
                    Module.defers[module.id].done( function () {
                        delete module.async;
                    });
                    exports = module.factory.call( window, Require( module.id ), module.exports, module );
                    if (exports) {
                        module.exports = exports;
                    }
                }
            } catch (ex) {
                module.status = STATUS.ERROR;
                Module.fail( module, ex);
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
        G.log( 'MOD: '+module.id );
        G.log( 'DEP: '+module.dependencies.map( function ( dep ) {
            return dep.id;
        } ) );
        G.log( 'ERR: '+err.message );
        Module.defers[module.id].reject();
        throw err;
    };

    Module.fetch = function ( module ) {
        var id     = module.id;
        module.url = getAbsoluteUrl( id );

        // always try .js ext
        var ext = getExt( module.url ) || '.js';
        var loader = Module.Plugin.Loaders[ext] || Module.Plugin.Loaders['.js'];

        loader( module, config );
    };

    Module.save = function ( id, deps, fn ) {
        var module = Module( id );

        deps = resolveDeps( deps, id );

        module.dependencies = deps;
        module.factory      = fn;
        module.status       = STATUS.SAVED;

        Module.wait( module );
    };

    Module.remove = function (id) {
        var module = Module(id);
        delete Module.cache[module.id];
        delete Module.defers[module.id];
    };

    Module.Plugin = {
        Loaders: {
            '.js'     : jsLoader,
            '.css'    : cssLoader,
            '.cmb.js' : cmbJsLoader
        }
    };

    // Loaders
    function cmbJsLoader ( module, config) {
        var id      = module.id;
        var combine = config.combine[id];

        if (combine) {
            if (config.debug) {
                return define(id, combine);
            } else {
                combine = combine.map(function (id) {
                    return Module(id);
                });
                combine.forEach(function (dep) {
                    if (dep.status < STATUS.FETCHING) {
                        dep.status = STATUS.FETCHING;
                    }
                });
            }
        }

        jsLoader(module, config);
    }

    function jsLoader ( module ) {
        var node  = doc.createElement( "script" );
        var done  = false;
        var timer = setTimeout( function () {
            head.removeChild( node );
            Module.fail( module, 'Load timeout' );
        }, 30000 ); // 30s

        node.setAttribute( 'type', "text/javascript" );
        node.setAttribute( 'charset', 'utf-8' );
        node.setAttribute( 'src', module.url );
        node.setAttribute( 'async', true );

        node.onload = node.onreadystatechange = function(){
            if ( !done &&
                    ( !this.readyState ||
                       this.readyState === "loaded" ||
                       this.readyState === "complete" )
            ){
                // clear
                done = true;
                clearTimeout( timer );
                node.onload = node.onreadystatechange = null;

                if (module.status === STATUS.FETCHING) {
                    module.status = STATUS.FETCHED;
                }

                if ( module.status > 0 && module.status < STATUS.SAVED ) {
                    G.log( module.id + ' is not a module' );
                    Module.ready( module );
                }
            }
        };

        node.onerror = function(){
            clearTimeout( timer );
            head.removeChild( node );
            Module.fail( module, new Error( 'Load Fail' ) );
        };
        module.status = STATUS.FETCHING;
        head.appendChild( node );
    }

    // `onload` event is supported in WebKit since 535.23
    // Ref:
    //  - https://bugs.webkit.org/show_activity.cgi?id=38995
    var isOldWebKit = util.ua.webkit && util.ua.webkit < 536;

    // `onload/onerror` event is supported since Firefox 9.0
    // Ref:
    //  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
    //  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
    var isOldFirefox = window.navigator.userAgent.indexOf('Firefox') > 0 &&
        !('onload' in document.createElement('link'));

    function cssLoader ( module ) {
        var node = doc.createElement( "link" );
        var timer;
        node.setAttribute( 'type', "text/css" );
        node.setAttribute( 'href', module.url );
        node.setAttribute( 'rel', 'stylesheet' );

        if ( !isOldWebKit && !isOldFirefox ) {
            node.onload = onCSSLoad;
            node.onerror = function () {
                clearTimeout( timer );
                head.removeChild( node );
                Module.fail( module, new Error( 'Load Fail' ) );
            };
        } else {
            setTimeout(function() {
                poll(node, onCSSLoad);
            }, 0); // Begin after node insertion
        }

        module.status = STATUS.FETCHING;
        head.appendChild(node);

        timer = setTimeout(function () {
            head.removeChild(node);
            Module.fail( module, new Error( 'Load timeout' ) );
        }, 30000); // 30s

        function onCSSLoad() {
            clearTimeout( timer );
            if (module.status === STATUS.FETCHING) {
                module.status = STATUS.FETCHED;
            }
            Module.ready( module );
        }

        function poll(node, callback) {
            var isLoaded;
            if ( isOldWebKit ) {                // for WebKit < 536
                if ( node.sheet ) {
                    isLoaded = true;
                }
            } else if ( node.sheet ) {       // for Firefox < 9.0
                try {
                    if ( node.sheet.cssRules ) {
                        isLoaded = true;
                    }
                } catch ( ex ) {
                // The value of `ex.name` is changed from
                // 'NS_ERROR_DOM_SECURITY_ERR' to 'SecurityError' since Firefox 13.0
                // But Firefox is less than 9.0 in here, So it is ok to just rely on
                // 'NS_ERROR_DOM_SECURITY_ERR'
                    if (ex.name === 'NS_ERROR_DOM_SECURITY_ERR') {
                        isLoaded = true;
                    }
                }
            }

            setTimeout(function() {
                if (isLoaded) {
                    // Place callback in here due to giving time for style rendering.
                    callback();
                } else {
                    poll(node, callback);
                }
            }, 1);
        }

        return node;
    }

    // convert dep string to module object, and fetch if not loaded
    function resolveDeps ( deps, context ) {
        var require = Require( context );
        var modules = deps.map( function (dep) {
            return Module( require.resolve( dep ) );
        });
        var toFetch = modules.filter(function ( m ) {
            return m.status < STATUS.FETCHING;
        });

        toFetch.forEach( function ( dep ) {
            Module.fetch( dep );
        } );

        return modules;
    }

    // convers id to absolute url
    function getAbsoluteUrl ( id ) {
        var url = id;
        if ( util.path.isAbsolute( id ) ) {
            return id;
        }
        if ( config.version ) {
            var v = Date.now();
            v = config.version[id] || parseInt( ( v - ( v%72E5 ) ) / 1000, 10 );
            url = id.replace(/(\.(js|css|html?|swf|gif|png|jpe?g))$/i, '-' + v +"$1");
        }

        return util.path.realpath( G.config('baseUrl') + url );
    }

    function getExt ( url ) {
        var arr = url.split('.');
        if ( arr.length > 1 ) {
            return "." + arr[arr.length-1];
        }
    }
    G.Module = {
        cache: Module.cache,
        queue: Module.queue,
        remove: Module.remove
    };

    define( 'Promise', [], function () {
        return {
            when: G.when,
            defer: G.Deferred
        };
    });
    define( 'util', [], G.util );
    define( 'config', [], G.config() );
    define( 'require', [], function () {
        return Require(window.location.href);
    });
}) (window, G, G.util);