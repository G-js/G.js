(function (G) {
    G.Loader.addLoader(function () {
        var modules = Object.keys(G.Loader.buffer);
        var getVersion = G.util.getVersion;
        var version = 0;
        var url;

        if (!G.config('enableComboLoad') || modules.length <= 1) {
            return;
        }

        version = 0;
        url = modules.reduce(function (ret, module) {
            var v = getVersion(module);

            delete G.Loader.buffer[module];

            version = v > version ? v : version;

            ret.push(module);
            return ret;
        }, []);

        url = G.config('comboServer') + url.sort().join(',') + '?v=' + version;

        G.util.loadScript( { url: url } );
    });
})(G);
