// Function to create a blog card element
function createBlogCard(blog) {
    const blogLink = document.createElement('a');
    blogLink.href = blog.url;
    blogLink.target = '_blank';
    blogLink.rel = 'noopener noreferrer';
    blogLink.className = 'blog-link';
    blogLink.style = 'text-decoration: none; color: inherit; display: block;';

    const blogCard = document.createElement('div');
    blogCard.className = 'blog-card';
    blogCard.style = `
        background: #FFFFF9;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        border: 1px solid #e0e0e0;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    `;

    // Add hover effect
    blogCard.addEventListener('mouseenter', () => {
        blogCard.style.transform = 'translateY(-2px)';
        blogCard.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    });

    blogCard.addEventListener('mouseleave', () => {
        blogCard.style.transform = 'translateY(0)';
        blogCard.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
    });

    const title = document.createElement('h3');
    title.style = 'margin: 0 0 0.5rem 0; color: #1a73e8; font-size: 1.3rem;';
    title.textContent = blog.title;

    const description = document.createElement('p');
    description.style = 'margin: 0 0 1rem 0; color: #444; line-height: 1.5;';
    description.textContent = blog.description;

    const metaInfo = document.createElement('div');
    metaInfo.style = 'display: flex; gap: 1rem; align-items: center; font-size: 0.9rem; color: #666;';

    const category = document.createElement('span');
    category.style = 'background: #e8f0fe; color: #1a73e8; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem;';
    category.textContent = blog.category;

    const date = document.createElement('span');
    date.textContent = new Date(blog.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const readTime = document.createElement('span');
    readTime.textContent = blog.readTime;

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
        padding: 3rem 1rem;
        color: #666;
        font-size: 1.1rem;
    `;
    emptyState.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <i class="fas fa-pen-fancy" style="font-size: 2rem; color: #1a73e8; margin-bottom: 1rem;"></i>
        </div>
        <h3 style="color: #333; margin-bottom: 1rem;">No blog posts yet</h3>
        <p>I'm working on some interesting content. Check back soon!</p>
    `;

    blogsContainer.appendChild(emptyState);
}

// Load blogs when the page loads
document.addEventListener('DOMContentLoaded', loadBlogs); 