// Function to create a blog card element
function createBlogCard(blog) {
    const blogLink = document.createElement('a');
    blogLink.href = blog.url;
    blogLink.target = '_blank';
    blogLink.rel = 'noopener noreferrer';
    blogLink.className = 'blog-link';

    const blogCard = document.createElement('div');
    blogCard.className = 'blog-card';

    const img = document.createElement('img');
    img.src = blog.image;
    img.alt = blog.title;
    img.style = `width: ${blog.imageWidth}px; height: ${blog.imageHeight}px; border-radius: 6px; object-fit: cover; margin-right: 1rem;`;

    const contentDiv = document.createElement('div');

    const title = document.createElement('h4');
    title.style = 'margin: 0 0 0.3rem 0;';
    title.textContent = blog.title;

    const description = document.createElement('p');
    description.style = 'margin: 0; font-size: 0.98rem; color: #444;';
    description.textContent = blog.description;

    contentDiv.appendChild(title);
    contentDiv.appendChild(description);

    blogCard.appendChild(img);
    blogCard.appendChild(contentDiv);
    blogLink.appendChild(blogCard);

    return blogLink;
}

// Function to load and render blogs
async function loadBlogs() {
    try {
        const response = await fetch('blogs.yml');
        const yamlText = await response.text();
        const blogsData = jsyaml.load(yamlText);

        const blogsContainer = document.getElementById('blogs-container');

        blogsData.blogs.forEach(blog => {
            const blogCard = createBlogCard(blog);
            blogsContainer.appendChild(blogCard);
        });
    } catch (error) {
        console.error('Error loading blogs:', error);
    }
}

// Load blogs when the page loads
document.addEventListener('DOMContentLoaded', loadBlogs); 