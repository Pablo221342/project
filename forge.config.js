// forge.config.js
const path = require('path');

module.exports = {
  packagerConfig: {},
  rebuildConfig: {},
  makers: [
    { name: '@electron-forge/maker-squirrel', config: {} },
    { name: '@electron-forge/maker-zip',      platforms: ['darwin'] },
    { name: '@electron-forge/maker-deb',      config: {} },
    { name: '@electron-forge/maker-rpm',      config: {} }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html:    './src/index.html',
              js:      './src/renderer.js',
              name:    'main_window',
              preload: {
                // si se llama `preload.js`
                js: './src/preload.js'
                // o si de verdad está `preloaded.js`, cámbialo aquí:
                // js: './src/preloaded.js'
              }
            }
          ]
        }
      }
    }
  ]
};