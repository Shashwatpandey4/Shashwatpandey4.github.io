#!/usr/bin/env python3
"""
Markdown to Blog Converter
Converts markdown blog posts to HTML using the blog template.
"""

import os
import re
import sys
from datetime import datetime


def parse_markdown_blog(markdown_content):
    """Parse markdown content and extract metadata and content."""

    # Split content into sections
    sections = markdown_content.split("---")

    if len(sections) < 2:
        raise ValueError(
            "Invalid format. Expected metadata and content sections separated by '---'"
        )

    # Parse metadata
    metadata_lines = sections[0].strip().split("\n")
    metadata = {}

    for line in metadata_lines:
        if ":" in line:
            key, value = line.split(":", 1)
            metadata[key.strip()] = value.strip()

    # Parse content
    content_section = sections[1].strip()

    # Split content and references
    content_parts = content_section.split("```")

    if len(content_parts) < 3:
        raise ValueError(
            "Invalid format. Expected content and references sections separated by ```"
        )

    blog_content = content_parts[1].strip()

    # The references are at the very end, after the content
    # Find the references section by looking for lines that start with [number]
    all_lines = content_section.split("\n")
    references_start = -1

    for i, line in enumerate(all_lines):
        if re.match(r"^\[\d+\]", line.strip()):
            references_start = i
            break

    if references_start == -1:
        references_section = ""
    else:
        references_section = "\n".join(all_lines[references_start:])

    # Parse references
    references = {}
    current_ref = None
    current_content = []

    for line in references_section.split("\n"):
        line = line.strip()
        if line.startswith("[") and "]" in line:
            # Save previous reference if exists
            if current_ref:
                references[current_ref] = "\n".join(current_content).strip()

            # Start new reference
            ref_match = re.match(r"\[(\d+)\](.*)", line)
            if ref_match:
                current_ref = int(ref_match.group(1))
                current_content = [ref_match.group(2).strip()]
        elif current_ref and line:
            current_content.append(line)

    # Save last reference
    if current_ref:
        references[current_ref] = "\n".join(current_content).strip()

    return {"metadata": metadata, "content": blog_content, "references": references}


def convert_markdown_to_html(content):
    """Convert markdown content to HTML."""

    # Convert headers
    content = re.sub(r"^### (.*)$", r"<h3>\1</h3>", content, flags=re.MULTILINE)
    content = re.sub(r"^## (.*)$", r"<h2>\1</h2>", content, flags=re.MULTILINE)
    content = re.sub(r"^# (.*)$", r"<h1>\1</h1>", content, flags=re.MULTILINE)

    # Convert bold
    content = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", content)

    # Convert italic
    content = re.sub(r"\*(.*?)\*", r"<em>\1</em>", content)

    # Convert inline code
    content = re.sub(r"`(.*?)`", r"<code>\1</code>", content)

    # Convert code blocks
    content = re.sub(
        r"```(\w+)?\n(.*?)```", r"<pre><code>\2</code></pre>", content, flags=re.DOTALL
    )

    # Convert links
    content = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', content)

    # Convert lists
    content = re.sub(r"^\* (.*)$", r"<li>\1</li>", content, flags=re.MULTILINE)
    content = re.sub(r"^\d+\. (.*)$", r"<li>\1</li>", content, flags=re.MULTILINE)

    # Wrap lists
    content = re.sub(r"(<li>.*</li>)", r"<ul>\1</ul>", content, flags=re.DOTALL)

    # Convert paragraphs
    paragraphs = content.split("\n\n")
    html_paragraphs = []

    for para in paragraphs:
        para = para.strip()
        if para and not para.startswith("<"):
            para = f"<p>{para}</p>"
        html_paragraphs.append(para)

    return "\n\n".join(html_paragraphs)


def generate_html_blog(parsed_data, template_path="blogs/template.html"):
    """Generate HTML blog from parsed data using template."""

    # Read template
    with open(template_path, "r", encoding="utf-8") as f:
        template = f.read()

    # Extract metadata
    title = parsed_data["metadata"].get("title", "Blog Post")
    date = parsed_data["metadata"].get("date", datetime.now().strftime("%B %d, %Y"))
    category = parsed_data["metadata"].get("category", "General")

    # Convert content to HTML
    html_content = convert_markdown_to_html(parsed_data["content"])

    # Add reference numbers to content
    for ref_num in parsed_data["references"].keys():
        html_content = html_content.replace(
            f"[{ref_num}]", f'<span class="reference-number">[{ref_num}]</span>'
        )

    # Generate references JavaScript
    references_js = []
    for ref_num, ref_content in parsed_data["references"].items():
        ref_content_html = convert_markdown_to_html(ref_content)
        references_js.append(f"""
            {ref_num}: {{
                title: "Reference [{ref_num}]",
                content: `{ref_content_html}`
            }}""")

    references_js = ",\n".join(references_js)

    # Replace template placeholders
    html_blog = template.replace("Your Blog Post Title", title)
    html_blog = html_blog.replace("January 15, 2024", date)
    html_blog = html_blog.replace("Data Engineering", category)

    # Replace content
    content_start = html_blog.find("<!-- Main Blog Content Goes Here -->")
    content_end = html_blog.find("</div>", content_start)

    if content_start != -1 and content_end != -1:
        html_blog = (
            html_blog[:content_start]
            + html_blog[content_start:content_end].replace(
                '<p>This is where your main blog content will go. You can write in HTML format and include references like <span class="reference-number">[1]</span> which will automatically create supplementary information blocks.</p>',
                html_content,
            )
            + html_blog[content_end:]
        )

    # Replace references JavaScript
    js_start = html_blog.find("const references = {")
    js_end = html_blog.find("};", js_start)

    if js_start != -1 and js_end != -1:
        new_js = f"const references = {{\n{references_js}\n}};"
        html_blog = html_blog[:js_start] + new_js + html_blog[js_end + 2 :]
    else:
        # Fallback: try to find the references object differently
        js_start = html_blog.find("// Define your references here")
        if js_start != -1:
            # Find the opening brace after the comment
            brace_start = html_blog.find("{", js_start)
            brace_end = html_blog.find("};", brace_start)
            if brace_start != -1 and brace_end != -1:
                new_js = f"const references = {{\n{references_js}\n}};"
                html_blog = (
                    html_blog[:brace_start] + new_js + html_blog[brace_end + 2 :]
                )

    return html_blog


def main():
    """Main function to convert markdown to HTML blog."""

    if len(sys.argv) < 2:
        print("Usage: python markdown_to_blog.py <markdown_file> [output_file]")
        sys.exit(1)

    markdown_file = sys.argv[1]
    output_file = (
        sys.argv[2]
        if len(sys.argv) > 2
        else f"blogs/{os.path.splitext(os.path.basename(markdown_file))[0]}.html"
    )

    try:
        # Read markdown file
        with open(markdown_file, "r", encoding="utf-8") as f:
            markdown_content = f.read()

        # Parse markdown
        parsed_data = parse_markdown_blog(markdown_content)

        # Generate HTML
        html_blog = generate_html_blog(parsed_data)

        # Write output file
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_blog)

        print(f"✅ Blog generated successfully: {output_file}")

        # Update blogs.yml
        update_blogs_yml(parsed_data["metadata"], output_file)

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def update_blogs_yml(metadata, html_file):
    """Update blogs.yml with new blog entry."""

    yml_file = "blogs.yml"
    yml_content = ""

    # Read existing yml file
    if os.path.exists(yml_file):
        with open(yml_file, "r", encoding="utf-8") as f:
            yml_content = f.read()

    # Parse existing entries
    blogs = []
    if yml_content:
        # Simple parsing - you might want to use a proper YAML parser
        lines = yml_content.split("\n")
        current_blog = {}

        for line in lines:
            line = line.strip()
            if line.startswith("- title:"):
                if current_blog:
                    blogs.append(current_blog)
                current_blog = {}
                current_blog["title"] = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("description:"):
                current_blog["description"] = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("url:"):
                current_blog["url"] = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("date:"):
                current_blog["date"] = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("category:"):
                current_blog["category"] = line.split(":", 1)[1].strip().strip('"')
            elif line.startswith("readTime:"):
                current_blog["readTime"] = line.split(":", 1)[1].strip().strip('"')

        if current_blog:
            blogs.append(current_blog)

    # Add new blog entry
    new_blog = {
        "title": metadata.get("title", "Untitled"),
        "description": metadata.get("description", "Blog post"),
        "url": html_file,
        "date": metadata.get("date", datetime.now().strftime("%Y-%m-%d")),
        "category": metadata.get("category", "General"),
        "readTime": metadata.get("readTime", "5 min read"),
    }

    # Add to beginning of list
    blogs.insert(0, new_blog)

    # Write updated yml file
    yml_content = "blogs:\n"
    for blog in blogs:
        yml_content += f'  - title: "{blog["title"]}"\n'
        yml_content += f'    description: "{blog["description"]}"\n'
        yml_content += f'    url: "{blog["url"]}"\n'
        yml_content += f'    date: "{blog["date"]}"\n'
        yml_content += f'    category: "{blog["category"]}"\n'
        yml_content += f'    readTime: "{blog["readTime"]}"\n\n'

    with open(yml_file, "w", encoding="utf-8") as f:
        f.write(yml_content)

    print(f"✅ Updated {yml_file} with new blog entry")


if __name__ == "__main__":
    main()
