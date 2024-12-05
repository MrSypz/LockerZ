/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        loader: 'custom',
        loaderFile: './src/utils/imageLoader.js',
    },
}

module.exports = nextConfig

