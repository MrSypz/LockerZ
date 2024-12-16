export interface File {
    name: string;
    category: string;
    url: string;
    filepath: string;
    size: number;
    tags?: string[];
    lastModified: string;
}

