const base = require('./playwright.config');
module.exports = {...base,testMatch:'interview-fullscreen.spec.js',use:{...base.use,channel:'chrome'}};
