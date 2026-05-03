/**
 * Dev server proxy configuration.
 *
 * Adds Cross-Origin headers required for SharedArrayBuffer,
 * which is needed by the Fairy-Stockfish WASM engine (threading).
 */
module.exports = function (app) {
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
  });
};
