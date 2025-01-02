export interface File {
    name: string;
    category: string;
    filepath: string;
    size: number;
    tags?: string[];
    lastModified: string;
}

export interface FileResponse {
    files: File[];
    current_page: number;
    total_pages: number;
    total_files: number;
}

