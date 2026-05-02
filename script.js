// Function to create a blog list item element
function createBlogListItem(blog) {
    const listItem = document.createElement('li');
    listItem.className = 'blog-list-item';

    const blogLink = document.createElement('a');
    blogLink.href = blog.url;
    blogLink.textContent = blog.title;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'blog-date';
    dateSpan.textContent = blog.date || '';

    listItem.appendChild(blogLink);
    listItem.appendChild(dateSpan);
    return listItem;
}

// Function to load and render blogs
async function loadBlogs() {
    try {
        const response = await fetch('blogs.yml');
        const yamlText = await response.text();

        const blogsData = parseYAML(yamlText);

        const blogsContainer = document.getElementById('blogs-container');

        if (blogsContainer) {
            const blogList = document.createElement('ul');
            blogList.style = 'list-style: none; padding-left: 0; margin: 0;';
            blogsContainer.appendChild(blogList);

            blogsData.blogs.forEach(blog => {
                blogList.appendChild(createBlogListItem(blog));
            });
        }
    } catch (error) {
        console.error('Error loading blogs:', error);
        // Fallback: show static blog list
        showStaticBlogs();
    }
}

// Simple YAML parser for basic structure
function parseYAML(yamlText) {
    const blogs = [];
    const lines = yamlText.split('\n');
    let currentBlog = {};
    let inBlog = false;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('- title:')) {
            if (inBlog && currentBlog.title) {
                blogs.push(currentBlog);
            }
            currentBlog = {};
            inBlog = true;
            currentBlog.title = line.substring(8).trim().replace(/"/g, '');
        } else if (line.startsWith('url:')) {
            currentBlog.url = line.substring(4).trim().replace(/"/g, '');
        } else if (line.startsWith('date:')) {
            currentBlog.date = line.substring(5).trim().replace(/"/g, '');
        }
    }

    if (inBlog && currentBlog.title) {
        blogs.push(currentBlog);
    }

    return { blogs };
}

// Fallback function to show static blog list
function showStaticBlogs() {
    const blogsContainer = document.getElementById('blogs-container');
    if (!blogsContainer) return;

    const emptyState = document.createElement('div');
    emptyState.style = `
        text-align: center;
        padding: 1rem 0;
        color: #666;
        font-size: 0.95rem;
    `;
    emptyState.innerHTML = `
        <p style="margin: 0; line-height: 1.6;">No blog posts yet.</p>
    `;

    blogsContainer.appendChild(emptyState);
}

// Load blogs when the page loads
document.addEventListener('DOMContentLoaded', loadBlogs);
