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
