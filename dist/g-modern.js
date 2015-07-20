var G = this.G = {};
(function (G) {
    var config = {};
    G.config = function ( key, value ) {
        if ( ! arguments.length ) {
            return config;
        } else if ( arguments.length === 2 ) {
            config[ key ] = value;
        } else if ( typeof key === 'object' ) {
            Object.keys( key ).forEach(function (k) {
                config[ k ] = key[ k ];
            });
        } else {
            return config[ key ];
        }
    };
})(G);

(function (G) {
    var util = G.util = {};
    var MULTIPLE_SLASH_RE = /([^:\/])\/\/+/g;
    var DIRNAME_RE = /.*(?=\/.*$)/;
    var doc = document;
    var head = doc.head || doc.getElementsByTagName( 'head' )[0] || doc.documentElement;
    var baseElement = head.getElementsByTagName( 'base' )[0];

    // `onload` event is supported in WebKit since 535.23
    // Ref:
    //  - https://bugs.webkit.org/show_activity.cgi?id=38995
    var isOldWebKit = +navigator.userAgent.replace(/.*AppleWebKit.*?(\d+)\..*/i, '$1') < 536;

    // `onload/onerror` event is supported since Firefox 9.0
    // Ref:
    //  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
    //  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
    var isOldFirefox = window.navigator.userAgent.indexOf('Firefox') > 0 &&
        !('onload' in document.createElement('link'));


    util.getVersion = function (id) {
        var versions = G.config('version') || {};
        var version = versions[id];
        var expire = G.config('expire') || 604800;
        var now = Date.now() / 1000;
        if (!version) {
            version = parseInt(now - (now % expire), 10);
        }

        return version;
    };

    util.loadScript = function ( params, callback ) {
        var node  = doc.createElement( 'script' );
        var done  = false;
        var timer = null;
        params = params || {};
        node.setAttribute( 'type', 'text/javascript' );
        node.setAttribute( 'charset', 'utf-8' );
        node.setAttribute( 'async', true );
        callback = callback || function () {};
        if ( params.url ) {
            node.src = params.url;
        } else if (params.text) {
            node.text = params.text;
        }

        node.onload = node.onreadystatechange = function() {
            if ( !done &&
                ( !this.readyState ||
                    this.readyState === 'loaded' ||
                    this.readyState === 'complete'
                )
            ){
                // clear
                done = true;
                clearTimeout( timer );
                node.onload = node.onreadystatechange = null;
                callback();
            }
        };

        node.onerror = function(e){
            clearTimeout( timer );
            head.removeChild( node );
            callback(e);
        };

        timer = setTimeout( function () {
            head.removeChild( node );
            callback(new Error('time out'));
        }, 30000 ); // 30s

        if (baseElement) {
            head.insertBefore(node, baseElement);
        } else {
            head.appendChild(node);
        }

        return node;
    };

    util.loadStyle = function ( params, callback ) {
        var node = doc.createElement( 'link' );
        var timer;
        node.setAttribute( 'type', 'text/css' );
        node.setAttribute( 'href', params.url );
        node.setAttribute( 'rel', 'stylesheet' );

        if ( !isOldWebKit && !isOldFirefox ) {
            node.onload = onCSSLoad;
            node.onerror = function () {
                clearTimeout( timer );
                head.removeChild( node );
                callback(new Error( 'Load Fail' ));
            };
        } else {
            setTimeout(function() {
                poll(node, onCSSLoad);
            }, 0); // Begin after node insertion
        }

        head.appendChild(node);

        timer = setTimeout(function () {
            head.removeChild(node);
            callback( new Error( 'Load timeout' ) );
        }, 30000); // 30s

        function onCSSLoad() {
            clearTimeout( timer );
            callback();
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
    };

    util.path ={
        idToUrl: function ( id ) {
            if ( util.path.isAbsolute( id ) ) {
                return id;
            }

            return util.path.realpath( G.config('baseUrl') + id );
        },
        dirname: function ( url ) {
            var match = url.match(DIRNAME_RE);
            return (match ? match[0] : '.') + '/';
        },
        isAbsolute: function ( url ) {
            return url.indexOf('://') > 0 || url.indexOf('//') === 0;
        },
        isRelative: function ( url ) {
            return url.indexOf('./') === 0 || url.indexOf('../') === 0;
        },
        realpath: function (path) {
            MULTIPLE_SLASH_RE.lastIndex = 0;

            // 'file:///a//b/c' ==> 'file:///a/b/c'
            // 'http://a//b/c' ==> 'http://a/b/c'
            if (MULTIPLE_SLASH_RE.test(path)) {
                path = path.replace(MULTIPLE_SLASH_RE, '$1\/');
            }

            // 'a/b/c', just return.
            if (path.indexOf('.') === -1) {
                return path;
            }

            var original = path.split('/');
            var ret = [], part;

            for (var i = 0; i < original.length; i++) {
                part = original[i];

                if (part === '..') {
                    if (ret.length === 0) {
                        throw new Error('The path is invalid: ' + path);
                    }
                    ret.pop();
                } else if (part !== '.') {
                    ret.push(part);
                }
            }

            return ret.join('/');
        },
        map: function (url) {
            var newUrl = url;
            var maps = G.config('map') || [];
            var i = 0;
            var map;

            for (; i < maps.length; i++) {
                map = maps[i];

                newUrl = typeof map === 'function' ? map(url) : url.replace(map[0], map[1]);

                if (newUrl !== url) {
                    break;
                }
            }

            return newUrl;
        }
    };
}) (G);

(function () {
G.Deferred = function () {
    var PENDING = 'pending';
    var DONE    = 'done';
    var FAIL    = 'fail';

    var state = PENDING;
    var callbacks = {
            'done'  : [],
            'fail'  : [],
            'always': []
        };

    var args = [];
    var thisArg = {};

    var pub = {
        done: function (cb) {
            if (state === DONE) {
                setTimeout(function () {
                    cb.apply(thisArg, args);
                }, 0);
            }

            if (state === PENDING) {
                callbacks.done.push(cb);
            }
            return pub;
        },
        fail: function (cb) {
            if (state === FAIL) {
                setTimeout(function () {
                    cb.apply(thisArg, args);
                }, 0);
            }

            if (state === PENDING) {
                callbacks.fail.push(cb);
            }
            return pub;
        },
        always: function (cb) {
            if (state !== PENDING) {
                setTimeout(function () {
                    cb.apply(thisArg, args);
                }, 0);
                return;
            }

            callbacks.always.push(cb);
            return pub;
        },
        resolve: function () {
            if (state !== PENDING) {
                return pub;
            }

            args  = [].slice.call(arguments);
            state = DONE;
            dispatch(callbacks.done);
            return pub;
        },
        reject: function () {
            if (state !== PENDING) {
                return pub;
            }

            args  = [].slice.call(arguments);
            state = FAIL;
            dispatch(callbacks.fail);
            return pub;
        },
        state: function () {
            return state;
        },
        promise: function () {
            var ret = {};
            Object.keys(pub).forEach(function (k) {
                if (k === 'resolve' || k === 'reject') {
                    return;
                }
                ret[k] = pub[k];
            });
            return ret;
        }
    };

    function dispatch(cbs) {
        /*jshint loopfunc:true*/
        var cb;
        while( (cb = cbs.shift()) || (cb = callbacks.always.shift()) ) {
            setTimeout( (function ( fn ) {
                return function () {
                    fn.apply( {}, args );
                };
            })( cb ), 0 );
        }
    }

    return pub;
};

G.when = function ( defers ){
    if ( !Array.isArray( defers) ) {
        defers = [].slice.call(arguments);
    }
    var ret     = G.Deferred();
    var len     = defers.length;
    var count   = 0;
    var results = [];

    if (!len) {
        return ret.resolve().promise();
    }

    defers.forEach(function (defer, i) {
        defer
            .fail(function (err) {
                ret.reject(err);
            })
            .done(function (result) {
                results[i] = result;
                if (++count === len) {
                    ret.resolve.apply(ret, results);
                }
            });
    });

    return ret.promise();
};
})( G );

(function (G) {
    var loaders = [];

    G.Loader = {
        buffer: {},
        dispatch: function () {
            loaders.forEach(function (loader) {
                loader();
            });
        },
        addLoader: function (loader) {
            loaders.push(loader);
        }
    };
})(G);

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

(function (G) {
    G.Loader.addLoader(function () {
        var modules = Object.keys(G.Loader.buffer);

        modules.forEach(function (id) {
            var module = G.Loader.buffer[id];
            delete G.Loader.buffer[id];

            G.util.loadScript({ url: module.url }, function (err) {
                if ( err ) {
                    return G.Module.fail( module, err );
                }

                if ( module.status > 0 && module.status < G.Module.STATUS.SAVED ) {
                    G.Module.compile( module );
                }
            });
        });
    });
})(G);

(function (G) {
    G.Loader.addLoader(function () {
        var modules = Object.keys(G.Loader.buffer);

        modules.forEach(function (module) {
            if (!/\.css$/.test(module)) {
                return;
            }

            module = G.Loader.buffer[module];
            delete G.Loader.buffer[module.id];

            G.util.loadStyle( { url: module.url }, function () {
                G.Module.compile( module );
            });
        });
    });
})(G);
