const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(env, argv);

    // Customize the config before returning it.
    // Resolve source map warnings from node_modules
    config.module.rules.forEach(rule => {
        if (rule.use && Array.isArray(rule.use)) {
            rule.use.forEach(u => {
                if (u.loader && u.loader.includes('source-map-loader')) {
                    // Exclude node_modules from source-map-loader
                    if (!rule.exclude) {
                        rule.exclude = /node_modules/;
                    } else if (Array.isArray(rule.exclude)) {
                        rule.exclude.push(/node_modules/);
                    } else {
                        rule.exclude = [rule.exclude, /node_modules/];
                    }
                }
            });
        }
    });

    return config;
};
