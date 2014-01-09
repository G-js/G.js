define('specs/loader/amd/a.js', ['./b.js', 'specs/loader/amd/c.js'], function () { return {name: 'aa'}; });
define('specs/loader/amd/b.js', [], function () { return {name: 'b'}; });
define('specs/loader/amd/c.js', ['./d.js'], function () { return {name: 'c'}; });
define('specs/loader/amd/d.js', ['./e.js'], function () { return {name: 'd'}; });
define('specs/loader/x.js', ['specs/y.js'], function () { return {name: 'x'}; });
define('specs/y.js', function () { return {name: 'y'}; });
define('specs/module/z.js', {name: 'z'} );