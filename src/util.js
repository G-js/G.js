(function (G) {

    /******  Util  ******/
    G.util = {
        // prefix + '_' + timestamp + random
        guid: function ( prefix ) {
            prefix = prefix || '';
            return prefix  + '_' + Date.now() + Math.random();
        }
    };
    var util = G.util;

    /***** Language *****/
    util.lang = {
        isFunction: function ( obj ) {
            return typeof obj === 'function';
        },
        isString: function ( obj ) {
            return typeof obj === 'string';
        }
    };

    /******  Math  ******/
    util.math = {
        random: function ( from, to ) {
            return parseInt(Math.random() * (to - from + 1) + from, 10);
        }
    };


    /******  Path  ******/
    var MULTIPLE_SLASH_RE = /([^:\/])\/\/+/g;
    var DIRNAME_RE = /.*(?=\/.*$)/;

    util.path ={
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
        }
    };

    /*****  User Agent  *****/
    var ua = util.ua = {
        ie          : 0,
        opera       : 0,
        gecko       : 0,
        webkit      : 0,
        chrome      : 0,
        mobile      : null,
        air         : 0,
        ipad        : 0,
        iphone      : 0,
        ipod        : 0,
        ios         : null,
        android     : 0,
        os          : null
    };

    var UA = window.navigator.userAgent;

    if ( /windows|win32/i.test( UA ) ) {
        ua.os = 'windows';
    } else if ( /macintosh/i.test( UA ) ) {
        ua.os = 'macintosh';
    } else if ( /rhino/i.test( UA )) {
        ua.os = 'rhino';
    }

    if ( /KHTML/.test( UA ) ) {
        ua.webkit = true;
    }

    var match = UA.match( /AppleWebKit\/([^\s]*)/ );
    if ( match && match[1] ) {
        ua.webkit = numberify( match[1] );

        if ( / Mobile\//.test( UA ) ) {
            ua.mobile = "Apple";

            match = UA.match( /OS ([^\s]*)/ );
            if ( match && match[1] ) {
                match = numberify( match[1].replace( '_', '.' ) );
            }
            ua.ipad   = ( navigator.platform === 'iPad' )   ? match : 0;
            ua.ipod   = ( navigator.platform === 'iPod' )   ? match : 0;
            ua.iphone = ( navigator.platform === 'iPhone' ) ? match : 0;
            ua.ios    = ua.ipad || ua.iphone || ua.ipod;
        } else {
            match = UA.match( /NokiaN[^\/]*|Android \d\.\d|webOS\/\d\.\d/ );
            if ( match ) {
                ua.mobile = match[0];
            }
            if ( / Android/.test( ua ) ) {
                ua.mobile = 'Android';
                match = UA.match( /Android ([^\s]*);/ );
                if ( match && match[1] ) {
                    ua.android = numberify( match[1] );
                }
            }
        }

        match = UA.match( /Chrome\/([^\s]*)/ );
        if ( match && match[1] ) {
            ua.chrome = numberify( match[1] );
        } else {
            match = UA.match( /AdobeAIR\/([^\s]*)/ );
            if ( match ) {
                ua.air = match[0];
            }
        }
    }

    if ( !ua.webkit ) {
        match = UA.match( /Opera[\s\/]([^\s]*)/ );
        if ( match && match[1] ) {
            ua.opera = numberify( match[1] );
            match = UA.match( /Opera Mini[^;]*/ );
            if ( match ) {
                ua.mobile = match[0];
            }
        } else {
            match = UA.match( /MSIE\s([^;]*)/ );
            if ( match && match[1] ) {
                ua.ie = numberify( match[1] );
            } else {
                match = UA.match( /Gecko\/([^\s]*)/ );
                if ( match ) {
                    ua.gecko=1;
                    match = UA.match( /rv:([^\s\)]*)/ );
                    if ( match && match[1] ) {
                        ua.gecko = numberify( match[1] );
                    }
                }
            }
        }
    }


    function numberify ( str ) {
        var count = 0;
        return parseFloat( str.replace( /\./g, function() {
            return ( count++ == 1 ) ? '' : '.';
        } ) );
    }

}) (G);