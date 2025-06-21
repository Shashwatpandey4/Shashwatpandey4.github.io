const content = {
    'de': `<h3 style='margin-top:0;'>Experience</h3>
        <div class='timeline' style='position: relative; margin: 2rem 0 2rem 0; padding-left: 0; border-left: none;'>
            <div style=\"position: absolute; left: calc(90px + 10px + 0.2rem + 1px); top: 0; bottom: 0; width: 2px; background: #e0e0e0; z-index: 0;\"></div>
            <div class='timeline-item' style='display: flex; align-items: flex-start; margin-bottom: 2.5rem; position: relative; z-index: 1;'>
                <div style='width: 90px; min-width: 90px; text-align: right; color: #888; font-size: 1rem; padding-right: 10px;'>Oct 2023 - Jul 2024</div>
                <div style='display: flex; align-items: center; margin-right: 18px; position: relative; z-index: 2;'>
                    <span style='width: 0.4rem; height: 0.4rem; background: #fff; border: 2px solid #1a73e8; border-radius: 50%; display: block; margin-right: 8px;'></span>
                    <img src='images/zocketads_logo.png' alt='Zocket Technologies' style='width: 2rem; height: 2rem; border-radius: 6px;'>
                </div>
                <div style='flex: 1;'>
                    <strong>Data Engineer, Zocket Technologies</strong><br>
                    • As a solo data engineer, collaborated with data analysts, backend devs and developed required data pipelines from scratch, responsible for setting up the infra for building ETL pipelines<br>
                    • Built near real-time data pipelines to get metrics on Zocket's ad manager in sync with Facebook, Google's ad manager<br>
                    • Refactored 10 previously existing architecture optimizing run time from ∼1hr 10 mins to ∼7 mins by implementing multi-threading<br>
                    • Reduced the number of API calls made by ETL pipelines to the source data by ∼84% (from 288 to 48 calls per ad account daily)<br>
                    • Migrated the entire data engineering infrastructure from AWS to GCP, from managed services to self-managed Spark and Airflow
                </div>
            </div>
            <div class='timeline-item' style='display: flex; align-items: flex-start; margin-bottom: 2.5rem; position: relative; z-index: 1;'>
                <div style='width: 90px; min-width: 90px; text-align: right; color: #888; font-size: 1rem; padding-right: 10px;'>Oct 2021 - Sept 2023</div>
                <div style='display: flex; align-items: center; margin-right: 18px; position: relative; z-index: 2;'>
                    <span style='width: 0.4rem; height: 0.4rem; background: #fff; border: 2px solid #1a73e8; border-radius: 50%; display: block; margin-right: 8px;'></span>
                    <img src='images/novo-nordisk-logo.png' alt='Novo Nordisk' style='width: 2rem; height: 2rem; border-radius: 6px;'>
                </div>
                <div style='flex: 1;'>
                    <strong>Data Engineer, Novo Nordisk</strong><br>
                    • Implemented AWS Glue ETL pipelines, creating 50+ pipelines with 32 deployed in production for efficient processing of activity plans, products, calls, meetings, and interactions<br>
                    • Implemented data quality checks, reducing source data issues by 40% and ensuring accurate data processing<br>
                    • Introduced Infrastructure-as-Code using AWS CDK, enhancing code security and maintainability<br>
                    • Optimized data storage using S3 bucket partitioning
                </div>
            </div>
        </div>
        <h3 style='margin-top:2rem;'>Projects</h3>
        <div class='de-projects' style='display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1rem;'>
            <a href="https://github.com/Shashwatpandey4/DataFlux" target="_blank" rel="noopener noreferrer" class="project-link">
                <div class='project-card'>
                    <img src='images/dataflux.png' alt='DataFlux' style='width: 64px; height: 64px; border-radius: 6px; object-fit: cover;'>
                    <div>
                        <h4 style='margin: 0 0 0.3rem 0;'>DataFlux</h4>
                        <p style='margin: 0; font-size: 0.98rem; color: #444;'>High-performance, multi-stream data ingestion simulator. Built for testing real-time pipelines.</p>
                    </div>
                </div>
            </a>
            <a href="https://github.com/Shashwatpandey4/Live-stream-prototype" target="_blank" rel="noopener noreferrer" class="project-link">
                <div class='project-card'>
                    <img src='images/livestream.png' alt='Live Stream Prototype' style='width: 64px; height: 64px; border-radius: 6px; object-fit: cover;'>
                    <div>
                        <h4 style='margin: 0 0 0.3rem 0;'>Live Stream Prototype</h4>
                        <p style='margin: 0; font-size: 0.98rem; color: #444;'>A modern, responsive video player with live streaming simulation, served by a Go backend and fully dockerized.</p>
                    </div>
                </div>
            </a>
            <!-- Project Three and Four cards commented out for now
            <div class='project-card' style='background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 0.7rem 1rem; min-width: 220px; max-width: 400px; height: 80px; display: flex; flex-direction: column; justify-content: center;'>
                <h4 style='margin: 0 0 0.3rem 0;'>Project Three</h4>
                <p style='margin: 0; font-size: 0.98rem; color: #444;'>A brief description of your third data engineering project goes here.</p>
            </div>
            <div class='project-card' style='background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: 0.7rem 1rem; min-width: 220px; max-width: 400px; height: 80px; display: flex; flex-direction: column; justify-content: center;'>
                <h4 style='margin: 0 0 0.3rem 0;'>Project Four</h4>
                <p style='margin: 0; font-size: 0.98rem; color: #444;'>A brief description of your fourth data engineering project goes here.</p>
            </div>
            -->
        </div>
        <h3 style='margin-top:2rem;'>Blogs</h3>
        <ul class="blog-list" style="margin-top: 1rem; padding-left: 1.2rem;">
            <li><a href="https://shashwat-pandey.medium.com/understanding-ssh-as-a-data-professional-29ecc869f5f3" target="_blank" rel="noopener noreferrer">Understanding SSH as a Data professional</a></li>
            <li><a href="https://shashwat-pandey.medium.com/understanding-apache-airflows-architecture-b9f238b5da43" target="_blank" rel="noopener noreferrer">Understanding Apache Airflow's Architecture</a></li>
            <li><a href="https://medium.com/@shashwat-pandey/building-an-analytics-solution-for-ad-campaigns-part-1-data-modelling-461f82a9c9e8" target="_blank" rel="noopener noreferrer">Building an Analytics Solution for Ad Campaigns (Part 1): Data Modelling</a></li>
            <li><a href="https://medium.com/@shashwat-pandey/apache-spark-vs-apache-beam-what-to-choose-when-94f938d0317f" target="_blank" rel="noopener noreferrer">Apache Spark vs Apache Beam: What to Choose When</a></li>
            <li><a href="https://medium.com/@shashwat-pandey/data-lake-table-formats-apache-iceberg-vs-apache-hudi-vs-delta-lake-10b67a1d587" target="_blank" rel="noopener noreferrer">Data Lake Table Formats: Apache Iceberg vs Apache Hudi vs Delta Lake</a></li>
        </ul>`,
    'ml': `<h3 style='margin-top:2rem;'>Reinforcement Learning</h3>
    <div class='papers-list' style='margin-top: 1rem;'>
        <div class='paper-item' style='margin-bottom: 1.5rem;'>
            <div style='display: flex; gap: 1rem; align-items: flex-start;'>
                <div style='flex: 1;'>
                    <h4 style='margin: 0 0 0.5rem 0;'>Interpretable Learning Dynamics in Unsupervised Reinforcement Learning</h4>
                    <p style='margin: 0 0 0.5rem 0; color: #666;'>Authors: Shashwat Pandey</p>
                    <p style='margin: 0 0 0.5rem 0;'>arXiv: <a href="https://arxiv.org/abs/2505.06279" target="_blank" rel="noopener noreferrer">2505.06279</a></p>
                    <p style='margin: 0;'>We present an interpretability framework for unsupervised reinforcement learning (URL) agents, aimed at understanding how intrinsic motivation shapes attention, behavior, and representation learning. Our findings show that curiosity-driven agents display broader, more dynamic attention and exploratory behavior than their extrinsically motivated counterparts.</p>
                </div>
                <img src='images/transformer_rnd_attention_landscape.png' alt='Transformer-RND Attention Landscape' style='width: 200px; height: 150px; object-fit: cover; border-radius: 6px;'>
            </div>
        </div>
    </div>
    <h3 style='margin-top:2rem;'>Projects</h3>
    <a href="https://github.com/Shashwatpandey4/unsupervised_rl_interp" target="_blank" rel="noopener noreferrer" class="project-link">
        <div class='project-card'>
            <img src='images/transformer_rnd_attention_landscape.png' alt='Transformer-RND Attention Landscape' style='width: 64px; height: 64px; border-radius: 6px; object-fit: cover;'>
            <div>
                <h4 style='margin: 0 0 0.3rem 0;'>Unsupervised RL Interpretability</h4>
                <p style='margin: 0; font-size: 0.9rem; color: #444;'>A comprehensive interpretability framework for understanding how curiosity-driven agents explore and represent the world in unsupervised RL settings.</p>
            </div>
        </div>
    </a>`,
    'rl': `<h3 style='margin-top:0;'>Papers</h3>
        <div class='papers-list' style='margin-top: 1rem;'>
            <div class='paper-item' style='margin-bottom: 1.5rem;'>
                <div style='display: flex; gap: 1rem; align-items: flex-start;'>
                    <div style='flex: 1;'>
                        <h4 style='margin: 0 0 0.5rem 0;'>Interpretable Learning Dynamics in Unsupervised Reinforcement Learning</h4>
                        <p style='margin: 0 0 0.5rem 0; color: #666;'>Authors: Shashwat Pandey</p>
                        <p style='margin: 0 0 0.5rem 0;'>arXiv: <a href="https://arxiv.org/abs/2505.06279" target="_blank" rel="noopener noreferrer">2505.06279</a></p>
                        <p style='margin: 0;'>We present an interpretability framework for unsupervised reinforcement learning (URL) agents, aimed at understanding how intrinsic motivation shapes attention, behavior, and representation learning. Our findings show that curiosity-driven agents display broader, more dynamic attention and exploratory behavior than their extrinsically motivated counterparts.</p>
                    </div>
                    <img src='images/transformer_rnd_attention_landscape.png' alt='Transformer-RND Attention Landscape' style='width: 200px; height: 150px; object-fit: cover; border-radius: 6px;'>
                </div>
            </div>
        </div>
        <h3 style='margin-top:2rem;'>Projects</h3>
        <a href="https://github.com/Shashwatpandey4/unsupervised_rl_interp" target="_blank" rel="noopener noreferrer" class="project-link">
            <div class='project-card'>
                <img src='images/transformer_rnd_attention_landscape.png' alt='Transformer-RND Attention Landscape' style='width: 64px; height: 64px; border-radius: 6px; object-fit: cover;'>
                <div>
                    <h4 style='margin: 0 0 0.3rem 0;'>Unsupervised RL Interpretability</h4>
                    <p style='margin: 0; font-size: 0.9rem; color: #444;'>A comprehensive interpretability framework for understanding how curiosity-driven agents explore and represent the world in unsupervised RL settings.</p>
                </div>
            </div>
        </a>`
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
        'ml-link': 'ml'
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