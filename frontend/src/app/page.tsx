import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"
import { Changelog } from "@/components/changelog"

const changelogItems = [
    {
        version: "0.1.3",
        date: "10-11-2024",
        sections: [
            {
                title: "Features",
                type: "feature",
                content: "- Now you can move files from category to other category without closing the program Yay!!"
            },
            {
                title: "Fixes",
                content: `
- Content are offset image when scrolling down
- Can't drag and drop the images
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
## Tag Feature
Now if you want to define your image in the category like posture you can add a tag in your image like action, sexy, etc.! More Manage by you !!
        `
            },
            {
                title: "Quality of Life",
                content: `
- Move the file instead of copy image to avoid redundancy.
- Add Modal when adding image to category
- Fading image when loading
- Category now selects the last one browsed, not the first category anymore
- Discord RPC built-in
- More progress logs when loading
        `
            },
            {
                title: "Optimize",
                content: "- Free the image if can't see"
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
- Optimize Multithread for flaskLog and flaskProcess.
- Optimize Responding on http request.
        `
            },
            {
                title: "Quality of Life",
                content: `
- Add Modal when clicking delete category.
- Add Modal when creating new category.
- Add Modal when edit is successful or not.
        `
            },
            {
                title: "Fixes",
                content: "- Edit Category is now editing correctly."
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
                content: "The first problem that I create this program is I'm too tired when trying to look for ref and it a real time spent for looking into that that I didn't manage the file, So instead of create the folder by manual why just make like this to preview the image in real time and easy to navigate the folder!"
            },
            {
                title: "Concept",
                type: "concept",
                content: `The concept of this program is the locker you can have many as many as your can / you can store and it store only img the category file path are \`C:\\Users\\"YourUser"\\LockerZ\` and all your categories and files are in here! just simple by this when you want to look into that you can just look into the locker it self and because it not the real world imaging that you're in the matrix and in the locker room your can navigate by just the 'Word'!`
            },
            {
                title: "Category",
                type: "category",
                content: `
- First when your program install you can't find any category because this program are base on user need! so make your own category and go!
- Now you are navigate your file by category!
- You can edit or delete it anytime! but for edit make sure your category is empty!`
            },
            {
                title: "Locker",
                type: "feature",
                content: "Your image are now gonna in the Locker( folder with name of your category ) and it have image preview Feature too!"
            },
            {
                title: "Image Preview",
                type: "preview",
                content: "You're able to see your image without Zooming 300% and you are now can click too see the full image!"
            },
            {
                title: "Drag n Drop",
                type: "feature",
                content: "You can upload your image into the category that you have made"
            }
        ]
    }
];


export default function Home() {
    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                    <h1 className="text-3xl font-bold p-6 gradient-text">Dashboard</h1>
                    <Dashboard />
                    <Changelog items={changelogItems} />
                </main>
            </div>
        </div>
    )
}

