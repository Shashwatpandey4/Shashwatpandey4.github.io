---
layout: default
title: Home
---

<!-- Add Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">

<!-- Add scripts at the top of the file -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/seedrandom/3.0.5/seedrandom.min.js"></script>
<script src="{{ '/assets/js/abstractImageGenerator.js' | relative_url }}"></script>

<!-- Profile Section -->
<div class="profile-section">
    <div class="profile-photo-container">
        <img src="{{ "/assets/images/profile.png" | relative_url }}" alt="Profile Photo" class="profile-photo">
    </div>
    <div class="profile-text">
        <div class="name-and-social">
            <h1>Shashwat Pandey</h1>
            <div class="social-icons">
                <a href="https://github.com/yourusername" target="_blank" title="GitHub">
                    <i class="fab fa-github"></i>
                </a>
                <a href="https://scholar.google.com/yourid" target="_blank" title="Google Scholar">
                    <i class="fas fa-graduation-cap"></i>
                </a>
                <a href="https://www.kaggle.com/yourusername" target="_blank" title="Kaggle">
                    <i class="fab fa-kaggle"></i>
                </a>
                <a href="mailto:your.email@example.com" title="Email">
                    <i class="fas fa-envelope"></i>
                </a>
                <a href="https://www.linkedin.com/in/yourusername" target="_blank" title="LinkedIn">
                    <i class="fab fa-linkedin"></i>
                </a>
                <a href="https://twitter.com/yourusername" target="_blank" title="X (Twitter)">
                    <i class="fa-brands fa-x-twitter"></i>
                </a>
            </div>
        </div>
        <p class="intro-text">
Graduate student at ASU (M.S. in Computer Engineering, Computer Systems) researching compiler optimizations at MPS Lab. Interests: compilers, systems, reinforcement learning, deep learning, and LLMs. 2 years as a Data Engineer, specializing in data pipelines, performance tuning, and system design. Bridging AI-driven optimizations with system performance.
        </p>
    </div>
</div>

<!-- Focus Section -->
<div class="focus-section">
  <h2 class="section-title">Focus</h2>

  <div class="focus-grid">
    <div class="focus-item">
        <div class="focus-thumbnail" data-title="Large Language Models">
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const placeholder = document.querySelector('[data-title="Large Language Models"]');
                    if (placeholder) {
                        const img = document.createElement('img');
                        img.src = generateAbstractImage("LLM Focus");
                        placeholder.appendChild(img);
                    }
                });
            </script>
        </div>
        <h3>Large Language Models</h3>
        <ul>
            {% assign llm_posts = site.posts | where: "category", "llm" %}
            {% for post in llm_posts %}
                <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
            {% endfor %}
        </ul>
    </div>

    <div class="focus-item">
        <div class="focus-thumbnail" data-title="Reinforcement Learning">
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const placeholder = document.querySelector('[data-title="Reinforcement Learning"]');
                    if (placeholder) {
                        const img = document.createElement('img');
                        img.src = generateAbstractImage("RL Focus");
                        placeholder.appendChild(img);
                    }
                });
            </script>
        </div>
        <h3>Reinforcement Learning</h3>
        <ul>
            {% assign rl_posts = site.posts | where: "category", "rl" %}
            {% for post in rl_posts %}
                <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
            {% endfor %}
        </ul>
    </div>

    <div class="focus-item">
        <div class="focus-thumbnail" data-title="Compilers & Systems">
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const placeholder = document.querySelector('[data-title="Compilers & Systems"]');
                    if (placeholder) {
                        const img = document.createElement('img');
                        img.src = generateAbstractImage("Compilers Focus");
                        placeholder.appendChild(img);
                    }
                });
            </script>
        </div>
        <h3>Compilers & Systems</h3>
        <ul>
            {% assign compiler_posts = site.posts | where: "category", "compiler" %}
            {% for post in compiler_posts %}
                <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
            {% endfor %}
        </ul>
    </div>

    <div class="focus-item">
        <div class="focus-thumbnail" data-title="Deep Learning">
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const placeholder = document.querySelector('[data-title="Deep Learning"]');
                    if (placeholder) {
                        const img = document.createElement('img');
                        img.src = generateAbstractImage("DL Focus");
                        placeholder.appendChild(img);
                    }
                });
            </script>
        </div>
        <h3>Deep Learning</h3>
        <ul>
            {% assign dl_posts = site.posts | where: "category", "dl" %}
            {% for post in dl_posts %}
                <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
            {% endfor %}
        </ul>
    </div>
  </div>
</div>

<!-- Pet Projects Section -->
<h2 class="section-title">Pet Projects</h2>

<div class="projects">
    <div class="project-card">
        <div class="project-image"></div>
        <div class="project-description">
            <h3>Project Name</h3>
            <p>Short description about the project.</p>
        </div>
    </div>
    <div class="project-card">
        <div class="project-image"></div>
        <div class="project-description">
            <h3>Project Name</h3>
            <p>Short description about the project.</p>
        </div>
    </div>
</div>

<!-- Blog Posts Section -->
<h2 class="section-title">Blog Posts</h2>

<div class="blog-posts">
    {% assign blog_posts = site.posts | where: "category", "Blog" %}
    {% for post in blog_posts %}
    <div class="blog-card">
        <div class="blog-card-inner">
            <div class="blog-thumbnail" id="thumbnail-{{ forloop.index }}">
                {% if post.image and post.image.path %}
                    <img src="{{ post.image.path | relative_url }}" alt="{{ post.title }}">
                {% else %}
                    <div class="thumbnail-placeholder" data-title="{{ post.title }}"></div>
                    <script>
                        document.addEventListener('DOMContentLoaded', function() {
                            const placeholder = document.querySelector(`[data-title="{{ post.title }}"]`);
                            if (placeholder) {
                                const img = document.createElement('img');
                                img.src = generateAbstractImage("{{ post.title }}");
                                placeholder.appendChild(img);
                            }
                        });
                    </script>
                {% endif %}
            </div>
            <div class="blog-content">
                <h3 class="blog-title"><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
                <div class="blog-date">{{ post.date | date: "%B %d, %Y" }}</div>
                <p class="blog-excerpt">
                    {% if post.excerpt %}
                        {{ post.excerpt | strip_html | truncatewords: 25 }}
                    {% elsif post.description %}
                        {{ post.description | strip_html | truncatewords: 25 }}
                    {% else %}
                        {{ post.content | strip_html | truncatewords: 25 }}
                    {% endif %}
                </p>
                <div class="blog-tags">
                    {% for tag in post.tags %}
                    <span class="tag">{{ tag }}</span>
                    {% endfor %}
                </div>
                <a href="{{ post.url | relative_url }}" class="read-more">Read More →</a>
            </div>
        </div>
    </div>
    {% endfor %}
</div>

<!-- Footer Section -->
<footer class="footer">
    <p>© {{ 'now' | date: "%Y" }} Shashwat Pandey. All rights reserved.</p>
</footer>

<!-- Update Font Awesome to latest version -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
