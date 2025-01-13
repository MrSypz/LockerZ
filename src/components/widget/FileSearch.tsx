import React, { useState, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { File } from '@/types/file';

interface FileSearchProps {
    searchTerm: string;
    onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    files: File[];
}

interface Suggestion {
    type: 'file' | 'tag';
    value: string;
}

export function FileSearch({ searchTerm, onSearchChange, files }: FileSearchProps) {
    const { t } = useTranslation();
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get unique tags from all files
    const getAllTags = () => {
        const tags = new Set<string>();
        files.forEach(file => {
            file.tags?.forEach(tag => tags.add(tag.toLowerCase()));
        });
        return Array.from(tags);
    };

    // Get unique filenames
    const getAllFilenames = () => {
        return Array.from(new Set(files.map(file => file.name)));
    };

    const getCurrentWord = (value: string, position: number) => {
        const words = value.slice(0, position).split(/\s+/);
        return words[words.length - 1] || '';
    };

    const generateSuggestions = (word: string) => {
        if (!word) {
            setShowSuggestions(false);
            return;
        }

        let newSuggestions: Suggestion[] = [];

        // If word starts with #, suggest tags
        if (word.startsWith('#')) {
            const tagQuery = word.slice(1).toLowerCase();
            const matchingTags = getAllTags()
                .filter(tag => tag.toLowerCase().includes(tagQuery))
                .map(tag => ({ type: 'tag' as const, value: tag }));
            newSuggestions = matchingTags;
        }
        // Otherwise suggest filenames
        else {
            const fileQuery = word.toLowerCase();
            const matchingFiles = getAllFilenames()
                .filter(name => name.toLowerCase().includes(fileQuery))
                .map(name => ({ type: 'file' as const, value: name }));
            newSuggestions = matchingFiles;
        }

        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const currentWord = getCurrentWord(e.target.value, e.target.selectionStart || 0);
        generateSuggestions(currentWord);
        onSearchChange(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
        setCursorPosition(e.currentTarget.selectionStart || 0);

        // Close suggestions on Escape
        if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion: Suggestion) => {
        if (!inputRef.current) return;

        const words = searchTerm.split(/\s+/);
        const currentWord = getCurrentWord(searchTerm, cursorPosition);
        const currentWordIndex = words.findIndex(word => word === currentWord);

        if (currentWordIndex !== -1) {
            words[currentWordIndex] = suggestion.type === 'tag' ? `#${suggestion.value}` : suggestion.value;
        } else {
            words.push(suggestion.type === 'tag' ? `#${suggestion.value}` : suggestion.value);
        }

        const newSearchTerm = words.join(' ');
        const event = {
            target: {
                value: newSearchTerm
            }
        } as React.ChangeEvent<HTMLInputElement>;

        onSearchChange(event);
        setShowSuggestions(false);
    };

    const handleBlur = (e: React.FocusEvent) => {
        // Check if the related target is within the suggestions list
        if (!e.relatedTarget || !e.relatedTarget.closest('.suggestions-list')) {
            setTimeout(() => setShowSuggestions(false), 200);
        }
    };

    return (
        <div className="relative bg-black/50 flex-grow">
            <Input
                ref={inputRef}
                type="text"
                placeholder={t('locker.search.placeholder')}
                value={searchTerm}
                onChange={handleInputChange}
                onKeyUp={handleKeyUp}
                onBlur={handleBlur}
                className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>

            {showSuggestions && (
                <div className="absolute w-full mt-1 z-50 bg-background border rounded-md shadow-lg suggestions-list">
                    <Command className="rounded-lg border shadow-md">
                        <CommandEmpty className="py-2 px-4 text-sm text-gray-500">
                            {t('locker.search.no_suggestions')}
                        </CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-auto">
                            {suggestions.map((suggestion, index) => (
                                <CommandItem
                                    key={`${suggestion.type}-${suggestion.value}-${index}`}
                                    onSelect={() => handleSuggestionClick(suggestion)}
                                    className="cursor-pointer px-4 py-2 hover:bg-accent"
                                >
                                    <span className={suggestion.type === 'tag' ? 'text-blue-500' : ''}>
                                        {suggestion.type === 'tag' ? `#${suggestion.value}` : suggestion.value}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </div>
            )}
        </div>
    );
}