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
