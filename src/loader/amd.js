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
