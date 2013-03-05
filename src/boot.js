var G = this.G = {};

(function () {
    var config = {};
    G.config = function ( key, value ) {
        if ( !arguments.length ) {
            return config;
        } else if ( arguments.length === 2 ) {
            G.config.set( key, value );
        } else if ( Array.isArray(key) || typeof key === 'string' ) {
            return G.config.get( key );
        } else if ( typeof key === 'object' ) {
            Object.keys( key ).forEach(function ( k ) {
                G.config.set( k, key[k] );
            });
        }
    };
    G.config.set = function ( key, value ) {
        var host = config;
        if ( Array.isArray( key ) ) {
            var tmp = key;
            key = tmp.pop();
            tmp.forEach(function ( k ) {
                if ( !host[k] ) {
                    host[k] = {};
                }
                host = host[k];
            });
        }
        host[key] = value;
    };
    G.config.get = function ( key ) {
        if ( !key ) {
            return config;
        }
        var host = config;
        if ( Array.isArray( key ) ) {
            var len = key.length, i;
            for ( i = 0; i <= len - 2; i++) {
                if ( host[key[i]] ) {
                    host = host[key[i]];
                } else {
                    return host[key[i]];
                }
            }
            key = key[len-1];
        }
        return host[key];
    };
})();

G.log = function (data) {
    if (G.config.debug && typeof console != 'undefined' && console.log){
        console.log(data);
    }
};