
const isProd = process.env.NODE_ENV === 'production';

const internalHost = process.env.TAURI_DEV_HOST || 'localhost';
/** @type {import('next').NextConfig} */
const nextConfig: import('next').NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '3001',
            },
        ],
    },
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        // Nah it work is work!!!!!!!!!!!!!!!!!!!!!!!!
        ignoreBuildErrors: true,
    },
    // output: "export",
    assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
}

module.exports = nextConfig

