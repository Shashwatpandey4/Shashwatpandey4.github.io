const content = {
    'de': `<h3 style='margin-top:0;'>Experience</h3>
        <div class='timeline' style='position: relative; margin: 2rem 0 2rem 0; padding-left: 0; border-left: none;'>
            <div style=\"position: absolute; left: calc(90px + 10px + 0.2rem + 1px); top: 0; bottom: 0; width: 2px; background: #e0e0e0; z-index: 0;\"></div>
            <div class='timeline-item' style='display: flex; align-items: flex-start; margin-bottom: 2.5rem; position: relative; z-index: 1;'>
                <div style='width: 90px; min-width: 90px; text-align: right; color: #888; font-size: 1rem; padding-right: 10px;'>Oct 2023 - Jul 2024</div>
                <div style='display: flex; align-items: center; margin-right: 18px; position: relative; z-index: 2;'>
                    <span style='width: 0.4rem; height: 0.4rem; background: #fff; border: 2px solid #1a73e8; border-radius: 50%; display: block; margin-right: 8px;'></span>
                    <img src='images/zocketads_logo.png' alt='Company A' style='width: 2rem; height: 2rem; border-radius: 6px;'>
                </div>
                <div style='flex: 1;'>
                    <strong>Data Engineer at Company A</strong><br>
                    Worked on building scalable data pipelines and ETL processes.
                </div>
            </div>
            <div class='timeline-item' style='display: flex; align-items: flex-start; margin-bottom: 2.5rem; position: relative; z-index: 1;'>
                <div style='width: 90px; min-width: 90px; text-align: right; color: #888; font-size: 1rem; padding-right: 10px;'>Oct 2021 - Jun 2023</div>
                <div style='display: flex; align-items: center; margin-right: 18px; position: relative; z-index: 2;'>
                    <span style='width: 0.4rem; height: 0.4rem; background: #fff; border: 2px solid #1a73e8; border-radius: 50%; display: block; margin-right: 8px;'></span>
                    <img src='images/novo-nordisk-logo.png' alt='Company B' style='width: 2rem; height: 2rem; border-radius: 6px;'>
                </div>
                <div style='flex: 1;'>
                    <strong>Intern at Company B</strong><br>
                    Assisted in data warehousing and analytics projects.
                </div>
            </div>
        </div>
        <h3 style='margin-top:2rem;'>Projects</h3>
        <div class='de-projects' style='display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;'>
            <a href=\"https://github.com/Shashwatpandey4/DataFlux\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-link\">\n                <div class='project-card' style='background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 0.7rem 1rem; min-width: 220px; max-width: 400px; height: 80px; display: flex; align-items: center; gap: 1rem;'>\n                    <img src='images/dataflux.png' alt='DataFlux' style='width: 64px; height: 64px; border-radius: 6px; object-fit: cover;'>\n                    <div>\n                        <h4 style='margin: 0 0 0.3rem 0;'>DataFlux</h4>\n                        <p style='margin: 0; font-size: 0.98rem; color: #444;'>High-performance, multi-stream data ingestion simulator. Built for testing real-time pipelines.</p>\n                    </div>\n                </div>\n            </a>\n            <div class='project-card' style='background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 0.7rem 1rem; min-width: 220px; max-width: 400px; height: 80px; display: flex; flex-direction: column; justify-content: center;'>\n                <h4 style='margin: 0 0 0.3rem 0;'>Project Two</h4>\n                <p style='margin: 0; font-size: 0.98rem; color: #444;'>A brief description of your second data engineering project goes here.</p>\n            </div>\n        </div>\n        <h3 style='margin-top:2rem;'>Blogs</h3>\n        <div class='de-blogs' style='display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;'>\n            <div class='blog-card' style='background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 0.7rem 1rem; min-width: 220px; max-width: 400px; height: 80px; display: flex; flex-direction: column; justify-content: center;'>\n                <h4 style='margin: 0 0 0.3rem 0;'>Blog Post One</h4>\n                <p style='margin: 0; font-size: 0.98rem; color: #444;'>A short summary of your first data engineering blog post goes here.</p>\n            </div>\n            <div class='blog-card' style='background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 0.7rem 1rem; min-width: 220px; max-width: 400px; height: 80px; display: flex; flex-direction: column; justify-content: center;'>\n                <h4 style='margin: 0 0 0.3rem 0;'>Blog Post Two</h4>\n                <p style='margin: 0; font-size: 0.98rem; color: #444;'>A short summary of your second data engineering blog post goes here.</p>\n            </div>\n        </div>`,
    'compiler': `<h3 style='margin-top:0;'>Compilers Experience</h3>
        <div class='timeline' style='margin: 2rem 0;'>
            <div class='timeline-item'>
                <div style='width: 90px; min-width: 90px; text-align: right; color: #888; font-size: 1rem; padding-right: 10px;'>2023 - Present</div>
                <div style='margin-right: 18px;'><span style='width: 0.4rem; height: 0.4rem; background: #fff; border: 2px solid #1a73e8; border-radius: 50%; display: inline-block; margin-right: 8px;'></span></div>
                <div style='flex: 1;'>
                    <strong>Research in MLIR and Compiler Technologies</strong><br>
                    Working on compiler optimizations and intermediate representations.
                </div>
            </div>
        </div>
        <h3 style='margin-top:2rem;'>Projects</h3>
        <div class='project-card' style='background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 0.7rem 1rem; min-width: 220px; max-width: 400px; height: 80px; display: flex; flex-direction: column; justify-content: center;'>
            <h4 style='margin: 0 0 0.3rem 0;'>MLIR Pass Explorer</h4>
            <p style='margin: 0; font-size: 0.98rem; color: #444;'>A tool to visualize and experiment with MLIR passes.</p>
        </div>`,
    'ml': `<h3 style='margin-top:0;'>Machine Learning Experience</h3>
        <div class='timeline' style='margin: 2rem 0;'>
            <div class='timeline-item'>
                <div style='width: 90px; min-width: 90px; text-align: right; color: #888; font-size: 1rem; padding-right: 10px;'>2022 - Present</div>
                <div style='margin-right: 18px;'><span style='width: 0.4rem; height: 0.4rem; background: #fff; border: 2px solid #1a73e8; border-radius: 50%; display: inline-block; margin-right: 8px;'></span></div>
                <div style='flex: 1;'>
                    <strong>Research in Large Language Models</strong><br>
                    Exploring transformer architectures and training techniques.
                </div>
            </div>
        </div>
        <h3 style='margin-top:2rem;'>Projects</h3>
        <div class='project-card' style='background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 0.7rem 1rem; min-width: 220px; max-width: 400px; height: 80px; display: flex; flex-direction: column; justify-content: center;'>
            <h4 style='margin: 0 0 0.3rem 0;'>LLM Playground</h4>
            <p style='margin: 0; font-size: 0.98rem; color: #444;'>A platform to experiment with and fine-tune LLMs.</p>
        </div>`,
    'rl': `<h3 style='margin-top:0;'>Reinforcement Learning Experience</h3>
        <div class='timeline' style='margin: 2rem 0;'>
            <div class='timeline-item'>
                <div style='width: 90px; min-width: 90px; text-align: right; color: #888; font-size: 1rem; padding-right: 10px;'>2021 - Present</div>
                <div style='margin-right: 18px;'><span style='width: 0.4rem; height: 0.4rem; background: #fff; border: 2px solid #1a73e8; border-radius: 50%; display: inline-block; margin-right: 8px;'></span></div>
                <div style='flex: 1;'>
                    <strong>Research in RL Algorithms</strong><br>
                    Working on policy gradients and deep RL methods.
                </div>
            </div>
        </div>
        <h3 style='margin-top:2rem;'>Projects</h3>
        <div class='project-card' style='background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 0.7rem 1rem; min-width: 220px; max-width: 400px; height: 80px; display: flex; flex-direction: column; justify-content: center;'>
            <h4 style='margin: 0 0 0.3rem 0;'>RL Gym</h4>
            <p style='margin: 0; font-size: 0.98rem; color: #444;'>A toolkit for developing and testing RL environments.</p>
        </div>`
};

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

// Add underline toggle for Areas of Interest tabs
document.addEventListener('DOMContentLoaded', function () {
    // IDs of all interest links and their keys
    const interestMap = {
        'de-link': 'de',
        'compiler-link': 'compiler',
        'ml-link': 'ml',
        'rl-link': 'rl'
    };
    const links = Object.keys(interestMap).map(id => document.getElementById(id));
    const interestContent = document.getElementById('interest-content');
    links.forEach(link => {
        if (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                links.forEach(l => l.classList.remove('active-interest'));
                link.classList.add('active-interest');
                // Update content
                const key = interestMap[link.id];
                if (content[key]) {
                    interestContent.innerHTML = content[key];
                } else {
                    interestContent.innerHTML = content['de']; // fallback
                }
            });
        }
    });
}); 