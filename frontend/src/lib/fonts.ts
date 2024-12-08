import { Noto_Sans_Mono, Noto_Sans_Thai } from 'next/font/google'

export const notoSansMono = Noto_Sans_Mono({
    subsets: ['latin'],
    weight: ['100', '200', '400', '600', '700'],
})

export const notoSansThai = Noto_Sans_Thai({
    subsets: ['thai'],
    weight: ['100', '200', '400', '600', '700'],
})

