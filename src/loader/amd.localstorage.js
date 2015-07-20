(function (G, global) {
    var localStorage = window.localStorage || undefined;
    var _define = global.define;
    var getVersion = G.util.getVersion;

    global.define = function (id, deps, fn) {
        var module, content, version;

        _define(id, deps, fn);
        if (G.config('enableLocalstorage')) {

            module  = G.Module.getOrCreate(id);
            version = getVersion(module.id);
            deps   = module.dependencies.map(function (dep) {
                return '"' + dep.id + '"';
            }).join(',');

            content = 'define('+
                            '"' + module.id + '",' +
                            '['+ deps +'],' +
                            module.factory.toString() +
                      ');//# sourceURL=' + module.url;

            try {
                localStorage.setItem('FILE#' + module.id, version + '#__#' + content);
            } catch (ex) {
                // ignore
            }
        }
    };

    G.Loader.addLoader(function () {
        var modules = Object.keys(G.Loader.buffer);

        if (G.config('enableLocalstorage')) {
            modules.forEach(function (module) {
                var version = getVersion(module);
                var content;

                try {
                    content = localStorage ? localStorage.getItem('FILE#' + module) : '';
                    if (content && parseInt(content.split('#__#')[0], 10) === version) {
                        content = content.split('#__#')[1];
                    } else {
                        return;
                    }
                } catch (ex) {
                    try{
                        localStorage.remoteItem('FILE#' + module);
                    } catch (e) {}

                    return;
                }

                delete G.Loader.buffer[module];
                setTimeout(function () {
                    G.util.loadScript( { text: content } );
                }, 0);
            });
        }
    });
})(G, window);
