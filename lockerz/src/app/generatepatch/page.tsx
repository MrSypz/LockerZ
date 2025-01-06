'use client'
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Copy, Save } from 'lucide-react';

const predefinedSnippets = [
    { label: "Feature List", value: "<ul><li>Feature 1</li><li>Feature 2</li></ul>" },
    { label: "Bug Fix", value: "<ul><li>Fixed issue with login</li><li>Resolved bug in navigation</li></ul>" },
    { label: "Code Example", value: "<pre><code>const x = 10;</code></pre>" },
];

const sectionTypes = [
    { label: "Feature", value: "feature" },
    { label: "Bug Fix", value: "concept" },
    { label: "Improvement", value: "preview" },
    { label: "Code", value: "code"}
];

const ChangelogGenerator = () => {
    const [version, setVersion] = useState('');
    const [date, setDate] = useState('');
    const [sections, setSections] = useState([{
        title: '',
        content: '',
        type: '',
        image: '',
        images: {
            before: '',
            after: ''
        }
    }]);
    const [output, setOutput] = useState('');
    const [selectedSnippet, setSelectedSnippet] = useState('');

    const handleAddSection = () => {
        setSections([...sections, {
            title: '',
            content: '',
            type: '',
            image: '',
            images: {
                before: '',
                after: ''
            }
        }]);
    };

    const handleRemoveSection = (index) => {
        const newSections = sections.filter((_, i) => i !== index);
        setSections(newSections);
    };

    const handleSectionChange = (index, field, value) => {
        const newSections = [...sections];
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            newSections[index][parent][child] = value;
        } else {
            newSections[index][field] = value;
        }
        setSections(newSections);
    };

    const handleSnippetSelect = (snippet) => {
        const newSections = [...sections];
        newSections[newSections.length - 1].content = snippet.value;  // Set content for the last section
        setSections(newSections);
        setSelectedSnippet(snippet.label);
    };

    const generateJSON = () => {
        const cleanSections = sections.map(section => {
            const cleanSection = { ...section };

            // Remove empty fields
            Object.keys(cleanSection).forEach(key => {
                if (key === 'images') {
                    if (!cleanSection.images.before && !cleanSection.images.after) {
                        delete cleanSection.images;
                    }
                } else if (!cleanSection[key]) {
                    delete cleanSection[key];
                }
            });

            return cleanSection;
        });

        const entry = {
            version,
            date,
            sections: cleanSections
        };

        const json = JSON.stringify([entry], null, 2);
        setOutput(json);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(output);
    };

    return (
        <div className="container mx-auto py-10">
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Changelog Entry Generator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Version</label>
                            <Input
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                placeholder="e.g., v1.0.0"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Date</label>
                            <Input
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                placeholder="e.g., January 1, 2024"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {sections.map((section, index) => (
                        <Card key={index} className="p-4 relative">
                            <div className="absolute top-2 right-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveSection(index)}
                                    className="text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-sm font-medium">Section Title</label>
                                    <Input
                                        value={section.title}
                                        onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                                        placeholder="e.g., Features"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Type</label>
                                    <select
                                        value={section.type}
                                        onChange={(e) => handleSectionChange(index, 'type', e.target.value)}
                                        className="mt-1 w-full"
                                    >
                                        <option value="">-- Select Type --</option>
                                        {sectionTypes.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="text-sm font-medium">Content</label>
                                <Textarea
                                    value={section.content}
                                    onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                                    placeholder="Section content (supports HTML)"
                                    className="mt-1"
                                    rows={4}
                                />
                                <div className="mt-2">
                                    <label className="text-sm">Quick Insert</label>
                                    <select
                                        className="mt-1 w-full"
                                        value={selectedSnippet}
                                        onChange={(e) => handleSnippetSelect(predefinedSnippets.find(snippet => snippet.label === e.target.value))}
                                    >
                                        <option value="">-- Select a Snippet --</option>
                                        {predefinedSnippets.map((snippet) => (
                                            <option key={snippet.label} value={snippet.label}>
                                                {snippet.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="text-sm font-medium">Single Image URL (optional)</label>
                                <Input
                                    value={section.image}
                                    onChange={(e) => handleSectionChange(index, 'image', e.target.value)}
                                    placeholder="Image URL"
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Before Image URL (optional)</label>
                                    <Input
                                        value={section.images.before}
                                        onChange={(e) => handleSectionChange(index, 'images.before', e.target.value)}
                                        placeholder="Before image URL"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">After Image URL (optional)</label>
                                    <Input
                                        value={section.images.after}
                                        onChange={(e) => handleSectionChange(index, 'images.after', e.target.value)}
                                        placeholder="After image URL"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </Card>
                    ))}

                    <div className="flex gap-4">
                        <Button onClick={handleAddSection} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Section
                        </Button>
                        <Button onClick={generateJSON} className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            Generate JSON
                        </Button>
                    </div>

                    {output && (
                        <div className="mt-6">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium">Generated JSON</label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyToClipboard}
                                    className="flex items-center gap-2"
                                >
                                    <Copy className="h-4 w-4" />
                                    Copy
                                </Button>
                            </div>
                            <pre className="bg-secondary p-4 rounded-lg overflow-x-auto">
                                {output}
                            </pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ChangelogGenerator;
