import {Dashboard} from "@/components/widget/Dashboard"
import {Changelog} from "@/components/widget/Changelog"

const changelogItems = [
    {
        version: "0.3.0 - beta",
        date: "1-1-2025",
        sections: [
            {
                title: "Rewrite",
                type: "Qol",
                content: `
                <div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-md mb-4">
                    <p class="text-blue-800 dark:text-blue-200">
                    <em>Note: I just finish port the node.js function into rust function it now native performance!</em>
                    PS: this one take a while to implement in rust cuz I never learn rust before but I make it! Ouob.
                    </p>
                </div>
              <h3 class="text-lg font-semibold mb-2">Rewrite Backend</h3>This update is huge size reduce around <b>~40mb</b> and it now native performance on rust instead of <b>node.js</b>
              `
            },
            {
                title: "Image Sorting",
                type: "feature",
                content: `
                    <h3 class="text-lg font-semibold mb-2">New Sorting Option</h3>
                    <p><strong>New Option:</strong> Sort by CreateAt order the lastest or oldest image that have been add into category</p> 
                `
            },
            {
                title: "Optimize",
                type: "preview",
                content: `
                    <p><strong>Performance Improvement:</strong> Reduce default image size to 960x540 and using .jpg instead .webp make it huge time process 
                    gain around ~94.25% faster.</p>
                    <p><strong>Cache System:</strong> for file lookup(for rust) </p>
                `
            },
            {
                title: "Fix",
                type: "feature",
                content: `
              <h3 class="text-lg font-semibold mb-2">Image Loading</h3><p><strong>Fix:</strong> freeze the screen when loading optimize images`
            },
            {
                title: "Feature",
                type: "feature",
                content: `
              <h3 class="text-lg font-semibold mb-2">Transparency Window</h3> new window look styles`
            },
            {
                title: "Feature",
                type: "feature",
                content: `
              <h3 class="text-lg font-semibold mb-2">New Titlebar</h3> Just for new look :)`
            }
        ]
    },
    {
        version: "0.2.6 - beta",
        date: "31-12-2024",
        sections: [
            {
                title: "Fix",
                type: "feature",
                content: `
              <h3 class="text-lg font-semibold mb-2">Missing opencv4100.dll</h3> it now include into the file`
            },
        ]
    },
    {
        version: "0.2.5 - beta",
        date: "16-12-2024",
        sections: [
            {
                title: "Fix",
                type: "feature",
                content: `
              <h3 class="text-lg font-semibold mb-2">Node.js</h3> Now remove archive it size smaller around 4kb
              <h3 class="text-lg font-semibold mb-2">Backend</h3> Fix Image Process Before linear to Area`
            },
        ]
    },
    {
        version: "0.2.4 - beta",
        date: "18-12-2024",
        sections: [
            {
                title: "Performance",
                type: "preview",
                content: `
              <h1 class="text-lg font-semibold mb-2">Image Optimize</h1>
              <p class="mb-4">Change the Sharp image optimize now using openCV</p>
              Hardcode rewrite image optimize are now native in tauri not on the node.js 
              <div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-md mb-4">
                <p class="text-blue-800 dark:text-blue-200">
                <em>Note: Due to sharp it have native dependency that make I can't compile into a binary file, so I decide to make it standalone in rust instead by using opencv the good is it can use hardware accurate
                </p>
              </div>
              `,
            },
            {
                title: "Quality of Life",
                type: "preview",
                content: `
              <h1 class="text-lg font-semibold mb-2">ContextMenu - Update</h1>
              <p class="mb-4">Now it can open the image folder directory!</p>
              `
            },
        ]
    },
    {
        version: "0.2.3 - beta",
        date: "15-12-2024",
        sections: [
            {
                title: "Fix",
                type: "feature",
                content: `
              <h3 class="text-lg font-semibold mb-2">Combobox Issue</h3>
              can't click on the combobox`
            },
            {
                title: "Performance",
                type: "preview",
                content: `
              <h1 class="text-lg font-semibold mb-2">Image Upload</h1>
              <p class="mb-4">Slightly improve the performance on uploadfile to locker</p>
              `,
            },
        ]
    },
    {
        version: "0.2.2 - beta",
        date: "14-12-2024",
        sections: [
            {
                title: "Performance",
                type: "preview",
                content: `
              <h1 class="text-lg font-semibold mb-2">Image Render</h1>
              <p class="mb-4">More Optimize to make it more configable Seeing in Locker Setting</p>
              `,
            },
            {
                title: "Quality of Life",
                type: "preview",
                content: `
              <h1 class="text-lg font-semibold mb-2">Locker Setting</h1>
              <ul class="list-disc pl-5 mt-2">
                <li>Image Quality : downgrade the image quality aka resolution</li>
                <li>Heigh Pixel : down/up grade the image resolution </li>
                <li>Width Pixel : down/up grade the image resolution</li>
              </ul>
              <div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-md mb-4">
                <p class="text-blue-800 dark:text-blue-200">
                <em>Note: Heigh and Width Pixel are the highest performance impact depend on your image size if you got image ~8k resolution or your image size are really big like around > 5 mb when loadign it'll take a time to loading image.</em>
                PS: this one will affect when first load only after that will nolonger affect due to cache image but cache are clear every year.
                </p>
              </div>
              `
            },
            {
                title: "Fix",
                type: "feature",
                content: `
              <h3 class="text-lg font-semibold mb-2">Calling Dupe</h3>
              When refresh the page it like refresh 3 time and now it fix it only call once slighly performance improve
              `
            }
        ]
    },
    {
        version: "0.2.1 - beta",
        date: "12-12-2024",
        sections: [
            {
                title: "Performance",
                type: "preview",
                content: `
              <h1 class="text-lg font-semibold mb-2">Image Render</h1>
              <p class="mb-4">I'm testing with my own pc and it comeout perty good the one thing is image loading and image rendering it now almost instant show up
              and when change page it update smootly nolonger have spike lag.</p>
              `,
            },
            {
                title: "Quality of Life",
                type: "preview",
                content: `
              <h1 class="text-lg font-semibold mb-2">Remember Cagetory/Page</h1>
              <p class="mb-4">when change to dashboard or setting and go back or close the program and open again.</p>
              <h1 class="text-lg font-semibold mb-2">Pag Navigation</h1>
              <p class="mb-4">Users can type the page wherever they want to go.</p>
              `
            },
            {
                title: "Fix",
                type: "feature",
                content: `
              <h3 class="text-lg font-semibold mb-2">Searching</h3>
              it now took the whole path/category not just in that page that you're currently on
              <h3 class="text-lg font-semibold mb-2">Image Viewer</h3>
              <p class="mb-4">it now use the full screen viewport.</p>

              `
            }
        ]
    },
    {
        version: "0.2.0 - beta",
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
                    <p>The new LockerZ Config path is now located at:</p>
                    <code class="block bg-gray-100 dark:bg-gray-800 p-2 rounded-md my-2">%appdata%\\lockerz\\config\\config.json</code>
                `
            },
            {
                title: "Dashboard",
                type: "preview",
                content: "<p>Complete re-design and re-implementation of the dashboard for improved user experience and functionality.</p>",
            },
            {
                title: "Settings",
                type: "preview",
                content: `
                    <p>Enhanced configurability with more options:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>The root directory path</li>
                        <li>Category Remember</li>
                        <li>Language options</li>
                    </ul>
                    <p class="mt-2">More configurations will be added in future updates.</p>
                `
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
                `
            },
            {
                title: "Categories",
                type: "preview",
                content: `
                    <p>Overhauled category management system:</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>New intuitive design for easier navigation</li>
                        <li>Improved editing capabilities</li>
                        <li>Adding Detail of each category</li>
                    </ul>
                `
            },
            {
                title: "Viewport",
                type: "preview",
                content: "<p>Introduced a new viewport style for improved content viewing and management.</p>"
            },
            {
                title: "Context Menu",
                type: "preview",
                content: `
                    <p>Visualize</p>
                    <ul class="list-disc pl-5 mt-2">
                        <li>Make it more easy to see</li>
                    </ul>
                `
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
                `
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
                `
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
                `
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
            },
            {
                title: "Porting",
                content: `
                    <h1 class="font-semibold mb-2">Porting Some Features from ElectronJs:</h1>
                    <ul class="list-disc pl-5">
                        <li>Drag and drop Feature</li>
                        <li>Category Editing</li>
                        <li>Image Context Menu</li>
                    </ul>
                `
            }
        ]
    },
    {
        version: "0.1.3 - beta",
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
        version: "0.1.2 - beta",
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
        version: "0.1.1 - beta",
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
        version: "0.1.0 - beta",
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
        <div className="flex flex-col h-screen">
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <Dashboard/>
                    <Changelog items={changelogItems}/>
                </div>
            </main>
        </div>
    )
}

