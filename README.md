# Shashwat Pandey - Personal Website

A simple, elegant personal website showcasing my work, experience, and original blog posts.

## Structure

- `index.html` - Main homepage with portfolio, projects, and experience
- `blogs.html` - Dedicated blogs page with enhanced layout
- `blogs.yml` - Blog post data in YAML format
- `blogs/` - Directory containing individual blog post HTML files
- `blogs/template.html` - Template for creating new blog posts
- `script.js` - JavaScript for dynamic blog loading
- `styles.css` - Styling for the entire website

## Blog Management

### Creating New Blog Posts

1. **Create a new HTML file** in the `blogs/` directory:
   ```bash
   cp blogs/template.html blogs/your-blog-post.html
   ```

2. **Edit the blog post** - Modify the HTML file with your content:
   - Update the title in the `<title>` tag
   - Change the blog title in the `<h1>` tag
   - Update the date and category in the meta section
   - Write your content in the blog-content div

3. **Add to `blogs.yml`** - Add an entry for your new blog:

```yaml
blogs:
  - title: "Your Blog Post Title"
    description: "Brief description of your blog post"
    url: "blogs/your-blog-post.html"
    date: "2024-01-15"
    category: "Data Engineering"
    readTime: "5 min read"
```

### Blog Post Fields:
   - `title` - The blog post title
   - `description` - Brief description/summary
   - `url` - Path to the HTML file (e.g., "blogs/your-post.html")
   - `date` - Publication date (YYYY-MM-DD format)
   - `category` - Blog category (e.g., "Data Engineering", "AI", "Analytics")
   - `readTime` - Estimated reading time

### Blog Content Features

- **HTML Formatting** - Full HTML support for rich content
- **Code Highlighting** - Syntax highlighting for code blocks
- **Responsive Images** - Images that work on all devices
- **Navigation** - Easy navigation between blog posts and main site
- **Consistent Styling** - Matches your main site design

### Blog Template Features

The `blogs/template.html` includes:
- **Headings** - H1, H2, H3 for content structure
- **Code Blocks** - Pre-formatted code with syntax highlighting
- **Lists** - Ordered and unordered lists
- **Blockquotes** - For important quotes or highlights
- **Links** - Internal and external links
- **Images** - Responsive image support
- **Navigation** - Links back to home and blogs page

### Customization

You can customize the blog layout by modifying:
- `blogs/template.html` - Blog post template and styling
- `script.js` - Blog card creation and styling
- `styles.css` - Overall styling and themes
- `blogs.html` - Page structure and layout

## Features

- **Clean, Modern Design** - Minimalist aesthetic with good typography
- **Responsive Layout** - Works seamlessly on desktop and mobile
- **Dynamic Blog Loading** - Blogs loaded from YAML data
- **Easy Content Management** - Simple HTML files for blog posts
- **Fast Loading** - Static HTML with minimal JavaScript
- **Original Content** - Host your own blog posts instead of external links

## Local Development

Simply open `index.html` in a web browser to view the site locally. For the blogs page to work properly, you'll need to serve the files through a local web server due to CORS restrictions when loading the YAML file.

You can use Python's built-in server:
```bash
python -m http.server 8000
```

Then visit `http://localhost:8000` to view the site. 