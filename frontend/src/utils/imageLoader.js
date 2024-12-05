export default function imageLoader({ src, width, quality }) {
    const url = new URL(src, process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
    url.searchParams.set('w', width);
    if (quality) {
        url.searchParams.set('q', quality);
    }
    return url.toString();
}

