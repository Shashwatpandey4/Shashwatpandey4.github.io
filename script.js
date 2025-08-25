// Function to create a blog card element
function createBlogCard(blog) {
    const blogLink = document.createElement('a');
    blogLink.href = blog.url;
    blogLink.target = '_blank';
    blogLink.rel = 'noopener noreferrer';
    blogLink.className = 'blog-link';
    blogLink.style = 'text-decoration: none; color: inherit; display: block;';

    const blogCard = document.createElement('div');
    blogCard.className = 'blog-card glass-card';
    blogCard.style = `
        background: rgba(255, 255, 255, 0.95);
        padding: 2rem;
        border-radius: 16px;
        margin-bottom: 0;
        border: 1px solid rgba(0,0,0,0.08);
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        height: 100%;
        display: flex;
        flex-direction: column;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    `;

    // Add hover effect
    blogCard.addEventListener('mouseenter', () => {
        blogCard.style.transform = 'translateY(-4px)';
        blogCard.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
        blogCard.style.borderColor = 'rgba(26, 115, 232, 0.3)';
    });

    blogCard.addEventListener('mouseleave', () => {
        blogCard.style.transform = 'translateY(0)';
        blogCard.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
        blogCard.style.borderColor = 'rgba(0,0,0,0.08)';
    });

    const title = document.createElement('h3');
    title.style = 'margin: 0 0 1rem 0; color: #1a73e8; font-size: 1.4rem; font-weight: 600; line-height: 1.3;';
    title.textContent = blog.title;

    const description = document.createElement('p');
    description.style = 'margin: 0 0 1.5rem 0; color: #555; line-height: 1.6; font-size: 1rem; flex-grow: 1;';
    description.textContent = blog.description;

    const metaInfo = document.createElement('div');
    metaInfo.style = 'display: flex; gap: 1rem; align-items: center; font-size: 0.9rem; color: #666; flex-wrap: wrap; margin-top: auto;';

    const category = document.createElement('span');
    category.style = 'background: #e8f0fe; color: #1a73e8; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; white-space: nowrap;';
    category.textContent = blog.category;

    const date = document.createElement('span');
    date.style = 'color: #888; font-size: 0.85rem;';
    date.textContent = new Date(blog.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const readTime = document.createElement('span');
    readTime.style = 'color: #888; font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem;';
    readTime.innerHTML = `<i class="fas fa-clock" style="font-size: 0.8rem;"></i>${blog.readTime}`;

    metaInfo.appendChild(category);
    metaInfo.appendChild(date);
    metaInfo.appendChild(readTime);

    blogCard.appendChild(title);
    blogCard.appendChild(description);
    blogCard.appendChild(metaInfo);
    blogLink.appendChild(blogCard);

    return blogLink;
}

// Function to load and render blogs
async function loadBlogs() {
    try {
        const response = await fetch('blogs.yml');
        const yamlText = await response.text();

        // Simple YAML parsing (you might want to use a proper YAML parser)
        const blogsData = parseYAML(yamlText);

        const blogsContainer = document.getElementById('blogs-container');

        if (blogsContainer) {
            blogsData.blogs.forEach(blog => {
                const blogCard = createBlogCard(blog);
                blogsContainer.appendChild(blogCard);
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
        } else if (line.startsWith('description:')) {
            currentBlog.description = line.substring(12).trim().replace(/"/g, '');
        } else if (line.startsWith('url:')) {
            currentBlog.url = line.substring(4).trim().replace(/"/g, '');
        } else if (line.startsWith('date:')) {
            currentBlog.date = line.substring(5).trim().replace(/"/g, '');
        } else if (line.startsWith('category:')) {
            currentBlog.category = line.substring(9).trim().replace(/"/g, '');
        } else if (line.startsWith('readTime:')) {
            currentBlog.readTime = line.substring(9).trim().replace(/"/g, '');
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

    // Show empty state message
    const emptyState = document.createElement('div');
    emptyState.style = `
        text-align: center;
        padding: 4rem 2rem;
        color: #666;
        font-size: 1.1rem;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        backdrop-filter: blur(10px);
        grid-column: 1 / -1;
    `;
    emptyState.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <i class="fas fa-pen-fancy" style="font-size: 3rem; color: #1a73e8; margin-bottom: 1rem; opacity: 0.8;"></i>
        </div>
        <h3 style="color: #333; margin-bottom: 1rem; font-size: 1.5rem;">No blog posts yet</h3>
        <p style="margin: 0; line-height: 1.6;">I'm working on some interesting content. Check back soon!</p>
    `;

    blogsContainer.appendChild(emptyState);
}

// Load blogs when the page loads
document.addEventListener('DOMContentLoaded', loadBlogs); 