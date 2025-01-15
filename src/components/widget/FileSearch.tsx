import React, { useRef, useState, useCallback } from 'react';
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
    type: 'file' | 'tag' | 'category';
    value: string;
    display: string;
}

interface SearchToken {
    type: 'tag' | 'category' | 'text';
    value: string;
}

export function FileSearch({ searchTerm, onSearchChange, files }: FileSearchProps) {
    const { t } = useTranslation();
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const getAllTags = useCallback(() => {
        const tags = new Set<string>();
        files.forEach(file => {
            file.tags?.forEach(tag => {
                tags.add(tag.name.toLowerCase());
            });
        });
        return Array.from(tags);
    }, [files]);

    const getAllCategories = useCallback(() => {
        return Array.from(new Set(files.map(file =>
            file.category.toLowerCase()).filter(Boolean)));
    }, [files]);

    const parseSearchTokens = (query: string): SearchToken[] => {
        const tokens = query.trim().split(/\s+/);
        return tokens.map(token => {
            if (token.startsWith('#')) {
                return { type: 'tag', value: token.slice(1).toLowerCase() };
            }
            if (token.startsWith('@')) {
                const categoryValue = token.slice(1).toLowerCase();
                if (!categoryValue) return { type: 'category', value: '' };
                return { type: 'category', value: categoryValue };
            }
            return { type: 'text', value: token.toLowerCase() };
        });
    };

    const getCurrentToken = (value: string, position: number): { token: string, startPos: number, endPos: number } => {
        const beforeCursor = value.slice(0, position);
        const afterCursor = value.slice(position);

        const startMatch = beforeCursor.match(/[^\s]*$/);
        const endMatch = afterCursor.match(/^[^\s]*/);

        const startPos = startMatch ? position - startMatch[0].length : position;
        const endPos = position + (endMatch ? endMatch[0].length : 0);

        return {
            token: value.slice(startPos, endPos),
            startPos,
            endPos
        };
    };

    const generateSuggestions = (currentToken: string) => {
        if (!currentToken) {
            setShowSuggestions(false);
            return;
        }

        let newSuggestions: Suggestion[] = [];

        if (currentToken.startsWith('#')) {
            // Tag suggestions
            const tagQuery = currentToken.slice(1).toLowerCase();
            const existingTags = new Set(
                parseSearchTokens(searchTerm)
                    .filter(token => token.type === 'tag')
                    .map(token => token.value)
            );

            newSuggestions = getAllTags()
                .filter(tag => !existingTags.has(tag) && tag.includes(tagQuery))
                .map(tag => ({
                    type: 'tag',
                    value: tag,
                    display: `#${tag}`
                }));
        } else if (currentToken.startsWith('@')) {
            // Category suggestions
            const catQuery = currentToken.slice(1).toLowerCase();
            const existingCategories = new Set(
                parseSearchTokens(searchTerm)
                    .filter(token => token.type === 'category')
                    .map(token => token.value)
            );

            newSuggestions = getAllCategories()
                .filter(cat => !existingCategories.has(cat) && cat.includes(catQuery))
                .map(cat => ({
                    type: 'category',
                    value: cat,
                    display: `@${cat}`
                }));
        } else {
            // File name suggestions
            const fileQuery = currentToken.toLowerCase();
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
        const { token } = getCurrentToken(e.target.value, e.target.selectionStart || 0);
        generateSuggestions(token);
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

        const { token, startPos, endPos } = getCurrentToken(searchTerm, cursorPosition);
        const beforeToken = searchTerm.slice(0, startPos);
        const afterToken = searchTerm.slice(endPos);

        const suggestionText = suggestion.type === 'tag'
            ? `#${suggestion.value}`
            : suggestion.type === 'category'
                ? `@${suggestion.value}`
                : suggestion.value;

        const newSearchTerm = `${beforeToken}${suggestionText}${afterToken}`;

        const event = {
            target: {
                value: newSearchTerm
            }
        } as React.ChangeEvent<HTMLInputElement>;

        onSearchChange(event);
        setShowSuggestions(false);

        // Set focus back to input and move cursor to end of inserted suggestion
        if (inputRef.current) {
            inputRef.current.focus();
            const newCursorPosition = startPos + suggestionText.length;
            inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
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