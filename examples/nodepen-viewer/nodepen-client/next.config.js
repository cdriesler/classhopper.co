/** @type {import('next').NextConfig} */
const withTM = require('next-transpile-modules')(['@nodepen/nodes', '@nodepen/core'])

const nextConfig = {
  distDir: 'build',
  reactStrictMode: true,
}

module.exports = withTM(nextConfig)
