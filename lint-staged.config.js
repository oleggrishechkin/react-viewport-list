module.exports = {
    ...require('./node_modules/configs-og/lint-staged.config.js'),
    '*.(ts|tsx)': ['eslint --quiet']
};
