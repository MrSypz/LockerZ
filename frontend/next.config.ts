/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',

    images: {
        loader: 'custom',
        loaderFile: './src/utils/imageLoader.js',
    },
}

module.exports = nextConfig

