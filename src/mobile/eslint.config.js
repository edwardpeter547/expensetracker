const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
    expoConfig,
    {
        ignores: ['dist/*'],
    },
    {
        rules: {
            // The existing style scheme invokes useTheme() through generator
            // functions dispatched by the useStyles hook, which the static
            // rules-of-hooks check cannot trace.
            'react-hooks/rules-of-hooks': 'off',
            // This rule is the React Compiler heuristic; the affected screens
            // intentionally trigger an initial async fetch on mount.
            'react-hooks/set-state-in-effect': 'off',
        },
    },
]);
