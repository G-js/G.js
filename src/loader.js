(function (G) {
    var loaders = [];

    G.Loader = {
        register: function (re, loader) {
            var fn = function (url) {
                if (re.test(url)) {
                    return loader;
                }

                return false;
            };

            loaders.push(fn);
        },
        match: function (url) {
            var i = 0;
            var match;

            do {
                match = loaders[i](url);

                if (match) {
                    break;
                }

                i ++;
            } while (i < loaders.length);

            return match;
        }
    };
})(G);