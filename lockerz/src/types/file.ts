export interface File {
    name: string;
    category: string;
    filepath: string;
    size: number;
    tags?: string[];
    last_modified: string;
    created_at: string;
}

export interface FileResponse {
    files: File[];
    current_page: number;
    total_pages: number;
    total_files: number;
}

export interface Category {
    [x: string]: any

    name: string
    file_count: number
    size: number
}
