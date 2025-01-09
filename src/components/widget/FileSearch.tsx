import React from 'react';
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileSearchProps {
    searchTerm: string;
    onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileSearch({ searchTerm, onSearchChange }: FileSearchProps) {
    const { t } = useTranslation();

    return (
        <div className="relative bg-black/50 flex-grow">
        <Input
            type="text"
    placeholder={t('locker.search.placeholder')}
    value={searchTerm}
    onChange={onSearchChange}
    className="pl-10"
    />
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
        </div>
);
}

