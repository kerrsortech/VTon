const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './src/index.tsx',
  output: {
    filename: 'chatbot-widget.js',
    path: path.resolve(__dirname, '../../public/widgets'),
    library: 'CloselookChatbotWidget',
    libraryTarget: 'window',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, '../..'),
      // Mock Next.js modules for standalone environment
      'next/navigation': path.resolve(__dirname, '../shared/mocks/next-navigation.ts'),
      'next/link': path.resolve(__dirname, '../shared/mocks/next-link.tsx'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  externals: {
    // Don't externalize React/ReactDOM - bundle them
  },
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
  },
};
