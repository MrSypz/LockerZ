import React, {useRef, useState} from 'react';
import {Input} from "@/components/ui/input";
import {Search} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Command, CommandEmpty, CommandGroup, CommandItem} from "@/components/ui/command";
import {File} from '@/types/file';

interface FileSearchProps {
    searchTerm: string;
    onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    files: File[];
}

interface Suggestion {
    type: 'file' | 'tag' | 'category' ;
    value: string;
    display: string;
}
export function FileSearch({ searchTerm, onSearchChange, files }: FileSearchProps) {
    const { t } = useTranslation();
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const getAllTags = () => {
        const tags = new Set<string>();
        files.forEach(file => {
            file.tags?.forEach(tag => tags.add(tag.toLowerCase()));
        });
        return Array.from(tags);
    };

    const getAllCategories = () => {
        return Array.from(new Set(files.map(file => file.category?.toLowerCase()).filter(Boolean)));
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

        if (word.startsWith('#')) {
            // Tag suggestions
            const tagQuery = word.slice(1).toLowerCase();
            newSuggestions = getAllTags()
                .filter(tag => tag.includes(tagQuery))
                .map(tag => ({
                    type: 'tag',
                    value: tag,
                    display: `#${tag}`
                }));
        } else if (word.startsWith('@')) {
            const catQuery = word.slice(1).toLowerCase();
            newSuggestions = getAllCategories()
                .filter(cat => cat.includes(catQuery))
                .map(cat => ({
                    type: 'category',
                    value: cat,
                    display: `@${cat}`
                }));
        } else {
            // File name suggestions
            const fileQuery = word.toLowerCase();
            newSuggestions = files
                .filter(file => file.name.toLowerCase().includes(fileQuery))
                .map(file => ({
                    type: 'file',
                    value: file.name,
                    display: file.name
                }));
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
                <div className="absolute w-full mt-1 z-50 bg-background border rounded-md shadow-lg">
                    <Command className="rounded-lg border shadow-md">
                        <CommandEmpty className="py-2 px-4 text-sm text-gray-500">
                            {t('locker.search.no_suggestions')}
                        </CommandEmpty>
                        <CommandGroup className="max-h-60 overflow-auto">
                            {suggestions.map((suggestion, index) => (
                                <CommandItem
                                    key={`${suggestion.type}-${suggestion.value}-${index}`}
                                    onSelect={() => handleSuggestionClick(suggestion)}
                                    className={`cursor-pointer px-4 py-2 hover:bg-accent ${
                                        suggestion.type === 'tag' ? 'text-blue-500' :
                                            suggestion.type === 'category' ? 'text-green-500' : ''
                                    }`}
                                >
                                    {suggestion.display}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </div>
            )}
        </div>
    );
}