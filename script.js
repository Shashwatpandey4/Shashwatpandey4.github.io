// Function to create a blog card element
function createBlogCard(blog) {
    // Check if we're on blogs.html page
    const isBlogsPage = window.location.pathname.includes('blogs.html') || 
                        window.location.pathname.endsWith('blogs.html') ||
                        document.getElementById('blogs-container') !== null;
    
    // If on blogs.html, create a simple list item
    if (isBlogsPage) {
        const listItem = document.createElement('li');
        listItem.style = 'margin-bottom: 0.8rem; list-style: none;';
        
        const blogLink = document.createElement('a');
        blogLink.href = blog.url;
        blogLink.target = '_blank';
        blogLink.rel = 'noopener noreferrer';
        blogLink.style = 'color: #1a73e8; text-decoration: none; font-size: 1.1rem;';
        blogLink.textContent = blog.title;
        
        // Add hover effect
        blogLink.addEventListener('mouseenter', () => {
            blogLink.style.textDecoration = 'underline';
            blogLink.style.color = '#174ea6';
        });
        
        blogLink.addEventListener('mouseleave', () => {
            blogLink.style.textDecoration = 'none';
            blogLink.style.color = '#1a73e8';
        });
        
        listItem.appendChild(blogLink);
        return listItem;
    }
    
    // Original card styling for other pages
    const blogLink = document.createElement('a');
    blogLink.href = blog.url;
    blogLink.target = '_blank';
    blogLink.rel = 'noopener noreferrer';
    blogLink.className = 'blog-link';
    blogLink.style = 'text-decoration: none; color: inherit; display: block; border-bottom: 1px solid #e0e0e0; padding-bottom: 1.5rem; margin-bottom: 1.5rem; width: 800px; margin-left: auto; margin-right: auto;';

    const blogCard = document.createElement('div');
    blogCard.className = 'blog-card glass-card';
    blogCard.style = `
        background: #ffffff;
        padding: 0;
        border-radius: 0;
        margin-bottom: 0;
        border: 1px solid rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        width: 800px !important;
        height: 160px !important;
        display: flex;
        flex-direction: row;
        overflow: hidden;
        flex-shrink: 0;
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
        blogCard.style.borderColor = 'rgba(0,0,0,0.15)';
    });

    // Create image section
    const imageSection = document.createElement('div');
    imageSection.style = 'width: 200px; height: 160px; background: #f5f5f5; border-radius: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';

    // Check if this is the first blog (Matrix Multiplication) to use matmul.png
    if (blog.title === "Understanding Matrix Multiplication Performance") {
        const blogImage = document.createElement('img');
        blogImage.src = 'images/matmul.png';
        blogImage.alt = blog.title;
        blogImage.style = 'width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;';
        imageSection.appendChild(blogImage);
    } else {
        const placeholderImage = document.createElement('div');
        placeholderImage.style = 'width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: bold;';
        placeholderImage.textContent = '📝';
        imageSection.appendChild(placeholderImage);
    }

    // Create content section
    const contentSection = document.createElement('div');
    contentSection.style = 'flex: 1; padding: 1.2rem; display: flex; flex-direction: column; justify-content: space-between; height: 160px;';

    const title = document.createElement('h3');
    title.style = 'margin: 0 0 1rem 0; color: #333; font-size: 1.3rem; font-weight: 600; line-height: 1.3; max-height: 3.9rem; overflow: hidden;';
    title.textContent = blog.title;


    const metaInfo = document.createElement('div');
    metaInfo.style = 'display: flex; gap: 1rem; align-items: center; font-size: 0.8rem; color: #888; flex-wrap: wrap; margin-top: auto;';

    const category = document.createElement('span');
    category.style = 'background: #e8f0fe; color: #1a73e8; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; white-space: nowrap;';
    category.textContent = blog.category;

    metaInfo.appendChild(category);

    contentSection.appendChild(title);
    contentSection.appendChild(metaInfo);

    blogCard.appendChild(imageSection);
    blogCard.appendChild(contentSection);
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
            // Check if we're on blogs.html page
            const isBlogsPage = window.location.pathname.includes('blogs.html') || 
                                window.location.pathname.endsWith('blogs.html') ||
                                document.getElementById('blogs-container') !== null;
            
            if (isBlogsPage) {
                // Create a simple unordered list for blogs.html
                const blogList = document.createElement('ul');
                blogList.style = 'list-style: none; padding-left: 0; margin: 0;';
                blogsContainer.appendChild(blogList);
                
                blogsData.blogs.forEach(blog => {
                    const listItem = createBlogCard(blog);
                    blogList.appendChild(listItem);
                });
            } else {
                // Original card layout for other pages
                blogsData.blogs.forEach(blog => {
                    const blogCard = createBlogCard(blog);
                    blogsContainer.appendChild(blogCard);
                });

                // Remove border from last card
                const blogLinks = document.querySelectorAll('.blog-link');
                if (blogLinks.length > 0) {
                    const lastCard = blogLinks[blogLinks.length - 1];
                    lastCard.style.borderBottom = 'none';
                    lastCard.style.marginBottom = '0';
                }
            }
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