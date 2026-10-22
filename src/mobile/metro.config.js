const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the root of the monorepo
const root = path.resolve(__dirname, '..');

const config = getDefaultConfig(__dirname);

// Important: Tell metro to watch the root too (for workspace symlinks)
config.watchFolders = [root];

// Important: Tell metro how to resolve node_modules
config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(root, 'node_modules'),
];


// Ignore the root node_modules from being watched (to avoid ENOENT)
// This is optional but can improve performance

config.resolver.blockList = [
    /\/expensetracker\/node_modules\/\.bin\//,
    /\/expensetracker\/node_modules\/\@[^\/]+\/.*/,
]

module.exports = config;