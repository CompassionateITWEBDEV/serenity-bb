// next.config.js
module.exports = {
  async rewrites() {
    return [{ source: '/old', destination: '/new' }];
  },
  async redirects() {
    return [{ source: '/from', destination: '/to', permanent: true }];
  },
};
