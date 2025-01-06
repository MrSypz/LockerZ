import { Noto_Sans_Mono, Noto_Sans_Thai, Noto_Sans_JP } from 'next/font/google'

export const notoSansMono = Noto_Sans_Mono({
    subsets: ['latin'],
    weight: ['100', '200', '400', '600', '700'],
})

export const notoSansThai = Noto_Sans_Thai({
    subsets: ['thai'],
    weight: ['100', '200', '400', '600', '700'],
})
export const notoSansJp = Noto_Sans_JP({
    subsets: ["latin"],
    weight: ['100', '200', '400', '600', '700'],
})

