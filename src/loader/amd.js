(function (G) {
    var doc = document;
    var head = doc.head || doc.getElementsByTagName( 'head' )[0] || doc.documentElement;
    var baseElement = head.getElementsByTagName( 'base' )[0];
    var CMB_RE = /\.cmb\.js$/;

    G.Loader.register(/\.js/, function ( module ) {
        var self  = this;
        var isCmb = CMB_RE.test( module.id );

        module.status = G.Module.STATUS.FETCHING;

        if ( isCmb ) {
            self.holdRequest();
        }

        loadScript( module.url, function (err) {
            if (err) {
                self.fail( err );
            } else {
                if (module.status === G.Module.STATUS.FETCHING) {
                    module.status = G.Module.STATUS.FETCHED;
                }

                if ( module.status > 0 && module.status < G.Module.STATUS.SAVED ) {
                    self.compile();
                }
                if ( isCmb ) {
                    self.flushRequest();
                }

                self.onLoad();
            }
        } );
    });

    function loadScript (url, callback) {
        var node  = doc.createElement( 'script' );
        var done  = false;
        var timer = setTimeout( function () {
            head.removeChild( node );
            callback( new Error( 'Load timeout' ) );
        }, 30000 ); // 30s

        node.setAttribute( 'type', 'text/javascript' );
        node.setAttribute( 'charset', 'utf-8' );
        node.setAttribute( 'src', url );
        node.setAttribute( 'async', true );

        node.onload = node.onreadystatechange = function(){
            if ( !done &&
                    ( !this.readyState ||
                       this.readyState === 'loaded' ||
                       this.readyState === 'complete' )
            ){
                // clear
                done = true;
                clearTimeout( timer );
                node.onload = node.onreadystatechange = null;

                callback();
            }
        };

        node.onerror = function(){
            clearTimeout( timer );
            head.removeChild( node );
            callback( new Error( 'Load Fail' ) );
        };

        baseElement ?
            head.insertBefore(node, baseElement) :
            head.appendChild(node);
    }
})(G);