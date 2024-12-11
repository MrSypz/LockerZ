import { Dashboard } from "@/components/widget/Dashboard"
import { Changelog } from "@/components/widget/Changelog"

const changelogItems = [
    {
        version: "0.2.0",
        date: "10-12-2024",
        sections: [
            {
                title: "Rewrite",
                content: `
                    <h3 class="text-lg font-semibold mb-2">Framework Migration</h3>
                    <p class="mb-4">Moved the main application from Electron.js to Tauri 2.0 for improved performance and smaller bundle size.</p>
                    <div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-md mb-4">
                        <p class="text-blue-800 dark:text-blue-200"><em>Note: Node.js is still used for the server; future plans include moving to native Tauri for further performance improvements.</em></p>
                    </div>
                    <h4 class="text-md font-semibold mb-2">Complete Rewrite</h4>
                    <p>The application has been entirely rewritten, which may result in some features not being immediately available in this version.</p>
                `
            },
            {
                title: "Config",
                type: "preview",
                content: `
                    <p>New Config path is now located at:</p>
                    <code class="block bg-gray-100 dark:bg-gray-800 p-2 rounded-md my-2">%appdata%\\lockerz\\config\\config.json</code>
                `
            },
            {
                title: "Dashboard",
                type: "preview",
                content: "<p>Complete re-design and re-implementation of the dashboard for improved user experience and functionality.</p>",
                images: {
                    after: "/img/Screenshot 2024-12-11 204117.png",
                    before: "/img/Screenshot 2024-12-11 204029.png"
                }
            },
            {
                title: "Settings",
                type: "preview",
                content: `
                    <p>Enhanced configurability with more options:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>Expanded user preferences</li>
                        <li>Advanced system settings</li>
                        <li>Customizable UI options</li>
                    </ul>
                    <p class="mt-2">More configurations will be added in future updates.</p>
                `,
                images: {
                    after: "/img/Screenshot 2024-12-11 205513.png",
                    before: "/img/Screenshot 2024-12-11 205502.png"
                }
            },
            {
                title: "Localization",
                type: "preview",
                content: `
                    <p>Introduced multi-language support! 🌍</p>
                    <p>You can now change the application language to your preference.</p>
                    <p class="mt-2">Currently supported languages:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>English</li>
                        <li>Thai</li>
                    </ul>
                `,
                images: {
                    after: "/img/Screenshot 2024-12-11 205513.png",
                    before: "/img/Screenshot 2024-12-11 205523.png"
                }
            },
            {
                title: "Categories",
                type: "preview",
                content: `
                    <p>Overhauled category management system:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>New intuitive design for easier navigation</li>
                        <li>Improved editing capabilities</li>
                        <li>Enhanced categorization algorithms</li>
                    </ul>
                `,
                images: {
                    after: "/img/Screenshot 2024-12-12 025855.png",
                    before: "/img/Screenshot 2024-12-12 030004.png"
                }
            },
            {
                title: "Viewport",
                type: "preview",
                content: "<p>Introduced a new viewport style for improved content viewing and management.</p>",
                images: {
                    after: "/img/Screenshot 2024-12-12 015911.png",
                    before: "/img/Screenshot 2024-12-12 030623.png"
                }
            },
            {
                title: "Image Viewer",
                type: "preview",
                content: `
                    <p>Major improvements to the image viewer:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>Smooth panning and zooming capabilities</li>
                        <li>Easy navigation between nearby images</li>
                        <li>Enhanced image quality and loading speed</li>
                    </ul>
                `,
                images: {
                    before: "/img/Screenshot 2024-12-12 031524.png",
                    after: "/img/Screenshot 2024-12-12 031515.png"
                }
            },
            {
                title: "Image Sorting",
                type: "feature",
                content: `
                    <p><strong>New Feature:</strong> Image sorting functionality</p>
                    <p>Current sorting options include:</p>
                    <ol class="list-decimal pl-5 mt-2">
                        <li>Date added</li>
                        <li>File name</li>
                        <li>File size</li>
                    </ol>
                    <p class="mt-2">More sorting options will be added in future updates.</p>
                `,
                image: "/img/Screenshot 2024-12-12 030706.png"
            },
            {
                title: "Searching",
                type: "feature",
                content: `
                    <p><strong>New Feature:</strong> Advanced search capabilities</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>Search across all categories</li>
                        <li>Filter by file type, date, and size</li>
                        <li>Sort search results</li>
                    </ul>
                `,
                image: "/img/Screenshot 2024-12-12 030732.png"
            },
            {
                title: "Optimize",
                content: `
                    <h4 class="font-semibold mb-2">Performance Enhancements:</h4>
                    <ul class="list-disc pl-5">
                        <li>Fuxking huge improved image loading speed</li>
                        <li>Optimized image viewing experience</li>
                        <li>Reduced memory usage for large image collections</li>
                    </ul>
                `,
                type: "concept"
            },
            {
                title: "Fixes",
                content: `
                    <h4 class="font-semibold mb-2">Bug Fixes:</h4>
                    <ul class="list-disc pl-5">
                        <li>Resolved spike lag issues when viewing images</li>
                        <li>Fixed problems with drag and drop functionality</li>
                        <li>Addressed various minor UI glitches</li>
                    </ul>
                `,
                type: "concept"
            },
            {
                title: "Features",
                content: `
                    <h4 class="font-semibold mb-2">New and Improved Features:</h4>
                    <ul class="list-disc pl-5">
                        <li>Redesigned sidebar for improved navigation</li>
                        <li>Enhanced image handling with drag-and-drop and click-to-select</li>
                        <li>Implemented category search functionality for easier organization</li>
                        <li>Added customizable hotkeys for frequently used actions</li>
                    </ul>
                `,
                type: "feature"
            }
        ]
    },
    {
        version: "0.1.3",
        date: "10-11-2024",
        sections: [
            {
                title: "Features",
                type: "feature",
                content: `
                    <p><strong>New Capability:</strong> Move files between categories without restarting the application.</p>
                    <p class="mt-2">This feature greatly improves workflow efficiency for managing large image collections.</p>
                `
            },
            {
                title: "Fixes",
                content: `
                    <h4 class="font-semibold mb-2">Resolved Issues:</h4>
                    <ul class="list-disc pl-5">
                        <li>Fixed content offset when scrolling through images</li>
                        <li>Resolved issues with drag and drop functionality</li>
                    </ul>
                `
            }
        ]
    },
    {
        version: "0.1.2",
        date: "08-11-2024",
        sections: [
            {
                title: "Features",
                type: "feature",
                content: `
                    <h3 class="text-lg font-semibold mb-2">Tag Feature</h3>
                    <p>Introducing a powerful tagging system for your images:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>Add custom tags to images (e.g., action, sexy, etc.)</li>
                        <li>Organize and find images based on tags</li>
                        <li>Improve categorization within your image collections</li>
                    </ul>
                    <p class="mt-2">This feature allows for more granular organization and easier image retrieval.</p>
                `
            },
            {
                title: "Quality of Life",
                type: "Qol",
                content: `
                    <h4 class="font-semibold mb-2">Improvements:</h4>
                    <ul class="list-disc pl-5">
                        <li>Implemented file moving instead of copying to avoid redundancy</li>
                        <li>Added confirmation modal when adding images to categories</li>
                        <li>Introduced fading effect for smoother image loading</li>
                        <li>Category selection now remembers the last browsed category</li>
                        <li>Integrated Discord Rich Presence support</li>
                        <li>Enhanced progress logging for better user feedback during operations</li>
                    </ul>
                `
            },
            {
                title: "Optimize",
                content: `
                    <p><strong>Performance Improvement:</strong> Implemented image unloading for off-screen content to reduce memory usage.</p>
                `
            }
        ]
    },
    {
        version: "0.1.1",
        date: "06-11-2024",
        sections: [
            {
                title: "Performance",
                content: `
                    <h4 class="font-semibold mb-2">Optimizations:</h4>
                    <ul class="list-disc pl-5">
                        <li>Enhanced multithreading for flaskLog and flaskProcess</li>
                        <li>Improved response times for HTTP requests</li>
                    </ul>
                `
            },
            {
                title: "Quality of Life",
                content: `
                    <h4 class="font-semibold mb-2">UI Enhancements:</h4>
                    <ul class="list-disc pl-5">
                        <li>Added confirmation dialog for category deletion</li>
                        <li>Implemented modal for creating new categories</li>
                        <li>Introduced feedback modals for successful or failed edits</li>
                    </ul>
                `
            },
            {
                title: "Fixes",
                content: "<p><strong>Bug Fix:</strong> Resolved issues with category editing functionality.</p>"
            }
        ]
    },
    {
        version: "0.1.0",
        date: "05-11-2024",
        sections: [
            {
                title: "Initial Beta",
                type: "feature",
                content: `
                    <p>Welcome to the first beta release of LockerZ!</p>
                    <p class="mt-2">This application aims to solve the problem of inefficient reference image management for artists and designers.</p>
                    <p class="mt-2">Key features:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>Real-time image preview</li>
                        <li>Easy navigation through categorized images</li>
                        <li>Streamlined workflow for managing large image collections</li>
                    </ul>
                `
            },
            {
                title: "Concept",
                type: "concept",
                content: `
                    <p>LockerZ is designed around the concept of a digital locker room for your images:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>Store and organize images in virtual "lockers" (categories)</li>
                        <li>Navigate your image collection using intuitive category names</li>
                        <li>All files are stored locally at: <code>C:\\Users\\"YourUser"\\LockerZ</code></li>
                    </ul>
                    <p class="mt-2">Think of it as a matrix-like environment where you can navigate your visual references effortlessly!</p>
                `
            },
            {
                title: "Category",
                type: "category",
                content: `
                    <h4 class="font-semibold mb-2">Category Management:</h4>
                    <ul class="list-disc pl-5">
                        <li>Start with a clean slate - create categories based on your needs</li>
                        <li>Navigate your files efficiently using custom categories</li>
                        <li>Edit or delete categories as your needs evolve (ensure categories are empty before editing)</li>
                    </ul>
                `
            },
            {
                title: "Locker",
                type: "feature",
                content: `
                    <p>The core of LockerZ - your personal image vaults:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>Each category acts as a separate "locker" for your images</li>
                        <li>Built-in image preview functionality for quick reference</li>
                        <li>Efficient storage and retrieval of your visual assets</li>
                    </ul>
                `
            },
            {
                title: "Image Preview",
                type: "preview",
                content: `
                    <p>Enhanced image viewing experience:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>View images without excessive zooming (no more 300% zoom required!)</li>
                        <li>Click to see full-size images for detailed inspection</li>
                        <li>Smooth and responsive image loading for a seamless experience</li>
                    </ul>
                `
            },
            {
                title: "Drag n Drop",
                type: "feature",
                content: `
                    <p><strong>Intuitive File Management:</strong> Easily upload images to your categories using drag and drop functionality.</p>
                    <p class="mt-2">This feature streamlines the process of populating your image collection, making organization a breeze.</p>
                `
            }
        ]
    }
];

export default function Home() {
    return (
        <div className="flex flex-col h-screen bg-background">
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <Dashboard />
                    <Changelog items={changelogItems} />
                </div>
            </main>
        </div>
    )
}

