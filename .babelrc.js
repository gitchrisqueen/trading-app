/*
 * Copyright (c) 2020. Christopher Queen Consulting LLC (http://www.ChristopherQueenConsulting.com/)
 */
//'use strict';

module.exports = {
    presets: ['@babel/preset-env', '@babel/preset-flow'],
    plugins: ["@babel/plugin-transform-modules-commonjs"],
    compact: true, // Enable compact mode
    overrides: [
        {
            test: /\.js$/,
            compact: true, // Force compacting for all JavaScript files
            generatorOpts: {
                shouldPrintComment: (val) => val.indexOf('@license') >= 0,
                minified: true,
                comments: false,
                compact: true,
                auxiliaryCommentBefore: "/* Compacted by Babel */",
                auxiliaryCommentAfter: "/* End of compacted code */",
            },
        },
    ],
};
