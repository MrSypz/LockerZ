import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Check,
    ChevronsUpDown,
    Upload,
    FolderOpen,
    Search,
    Folder,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Category } from "@/types/file";

// Reduced debounce delay for more responsive search
function useDebouncedValue<T>(value: T, delay: number = 150): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

interface CategorySelectorProps {
    selectedCategory: string;
    categories: Category[];
    isCategoriesLoading: boolean;
    onCategoryChange: (category: string) => void;
    uploadImgFiles: (droppedFiles?: string[]) => Promise<void>;
}

export default function CategorySelector({
                                             selectedCategory,
                                             categories,
                                             isCategoriesLoading,
                                             onCategoryChange,
                                             uploadImgFiles,
                                         }: CategorySelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchValue, setSearchValue] = useState("");
    const debouncedSearchValue = useDebouncedValue(searchValue);
    const { t } = useTranslation();
    const commandGroupRef = useRef<HTMLDivElement>(null);

    const allCategories = useMemo(() => ["all", ...categories], [categories]);

    // Optimized filtering logic
    const filteredCategories = useMemo(() => {
        const searchTerm = debouncedSearchValue.toLowerCase().trim();
        if (!searchTerm) return allCategories;

        return allCategories.filter(category =>
            category === "all"
                ? t("category.allCategories").toLowerCase().includes(searchTerm)
                : category.toLowerCase().includes(searchTerm)
        );
    }, [allCategories, debouncedSearchValue, t]);

    const handleSelect = useCallback((category: string) => {
        onCategoryChange(category);
        setOpen(false);
        setSearchValue("");
        setSelectedIndex(0);
    }, [onCategoryChange]);

    // Improved scroll handling
    const scrollSelectedIntoView = useCallback((index: number) => {
        requestAnimationFrame(() => {
            if (!commandGroupRef.current) return;
            const items = commandGroupRef.current.querySelectorAll('[role="option"]');
            const selectedItem = items[index] as HTMLElement;
            if (!selectedItem) return;

            const container = commandGroupRef.current;
            selectedItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        });
    }, []);

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;

        const handleKeyPress = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex(prev => {
                        const newIndex = prev > 0 ? prev - 1 : filteredCategories.length - 1;
                        scrollSelectedIntoView(newIndex);
                        return newIndex;
                    });
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex(prev => {
                        const newIndex = prev < filteredCategories.length - 1 ? prev + 1 : 0;
                        scrollSelectedIntoView(newIndex);
                        return newIndex;
                    });
                    break;
                case "Enter":
                    e.preventDefault();
                    if (filteredCategories[selectedIndex]) {
                        handleSelect(filteredCategories[selectedIndex]);
                    }
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [open, filteredCategories, handleSelect, selectedIndex, scrollSelectedIntoView]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex justify-between items-center mb-8"
        >
            <div className="flex items-center gap-4">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className={cn(
                                "w-[250px] justify-between",
                                "bg-white dark:bg-gray-800",
                                "hover:bg-gray-100 dark:hover:bg-gray-700",
                                "focus:ring-2 focus:ring-primary focus:outline-none",
                                "transition-all duration-200",
                                "group"
                            )}
                            disabled={isCategoriesLoading}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Folder className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
                                <span className="truncate">
                                    {selectedCategory
                                        ? categories.find(category => category === selectedCategory)
                                        || t("category.allCategories")
                                        : t("category.allCategories")}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform group-hover:scale-110" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0">
                        <Command className="rounded-lg border shadow-lg">
                            <div className="flex items-center px-3 border-b">
                                <Search className="h-4 w-4 text-muted-foreground mr-2" />
                                <CommandInput
                                    placeholder={t("category.search")}
                                    value={searchValue}
                                    onValueChange={setSearchValue}
                                    className="h-9 focus:outline-none"
                                />
                            </div>
                            <CommandEmpty className="py-4 text-center">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col items-center gap-2"
                                >
                                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        {t("category.notFound")}
                                    </p>
                                </motion.div>
                            </CommandEmpty>
                            <CommandGroup ref={commandGroupRef} className="max-h-[300px] overflow-y-auto">
                                {filteredCategories.map((category, index) => (
                                    <CommandItem
                                        key={category}
                                        value={category}
                                        onSelect={() => handleSelect(category)}
                                        className={cn(
                                            "cursor-pointer py-3 px-2",
                                            "transition-colors duration-150",
                                            selectedIndex === index && "bg-primary/5 dark:bg-primary/15",
                                            "hover:bg-primary/10 dark:hover:bg-primary/20"
                                        )}
                                    >
                                        <motion.div
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="flex items-center gap-2 w-full"
                                        >
                                            <div className="flex items-center justify-center w-6">
                                                {selectedCategory === category ? (
                                                    <Check className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <Folder className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                            <span className="flex-grow">
                                                {category === "all"
                                                    ? t("category.allCategories")
                                                    : category}
                                            </span>
                                        </motion.div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>

                <Button
                    onClick={() => uploadImgFiles()}
                    variant="default"
                    className="group relative overflow-hidden"
                >
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/20"
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    />
                    <div className="relative flex items-center gap-2">
                        <Upload className="h-4 w-4 transition-transform group-hover:scale-110" />
                        <span>{t("category.upload")}</span>
                    </div>
                </Button>
            </div>
        </motion.div>
    );
}