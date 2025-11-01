const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/index.tsx',
  output: {
    filename: 'try-on-widget.js',
    path: path.resolve(__dirname, '../../public/widgets'),
    library: 'CloselookTryOnWidget',
    libraryTarget: 'window',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    // Exclude React from bundle (or include it for standalone)
    // 'react': 'React',
    // 'react-dom': 'ReactDOM',
  },
};

