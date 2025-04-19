// Global variables
let blogData = {};
let activeTags = [];

// List of content sections — just update this array to add/remove sections
const contentSections = ["articles", "posts"];

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("content-sections").style.display = "none";
  fetchBlogData();
  document.getElementById("clear-tags").addEventListener("click", clearAllTags);
});

// Fetch the blog data from articles.json
async function fetchBlogData() {
  try {
    const response = await fetch("/assets/json/articles.json");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    blogData = await response.json();

    document.getElementById("loading").style.display = "none";
    document.getElementById("content-sections").style.display = "block";

    initializeTagSystem();
    renderContent();
  } catch (error) {
    console.error("Error fetching blog data:", error);
    document.getElementById("loading").innerHTML =
      "Error loading content. Please try again later.";
  }
}

// Initialize the tag system
function initializeTagSystem() {
  const allTags = extractAllTags();
  renderTags(allTags);
}

// Extract all unique tags from blog data
function extractAllTags() {
  const tagMap = new Map();

  contentSections.forEach((sectionName) => {
    const items = blogData[sectionName];
    if (items && Array.isArray(items)) {
      items.forEach((item) => {
        if (item.topics && Array.isArray(item.topics)) {
          item.topics.forEach((topic) => {
            const count = tagMap.get(topic) || 0;
            tagMap.set(topic, count + 1);
          });
        }
      });
    }
  });

  return Array.from(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

// Render tag elements
function renderTags(tags) {
  const tagContainer = document.getElementById("tag-container");
  tagContainer.innerHTML = "";

  tags.forEach(({ tag, count }) => {
    const tagElement = document.createElement("div");
    tagElement.className = "tag";
    tagElement.dataset.tag = tag;
    tagElement.innerHTML = `${tag} <span class="tag-count">[${count}]</span>`;

    tagElement.addEventListener("click", () => toggleTag(tag, tagElement));
    tagContainer.appendChild(tagElement);
  });
}

// Toggle tag selection
function toggleTag(tag, tagElement) {
  const index = activeTags.indexOf(tag);

  if (index === -1) {
    activeTags.push(tag);
    tagElement.classList.add("active");
  } else {
    activeTags.splice(index, 1);
    tagElement.classList.remove("active");
  }

  updateFilterStatus();
  filterContent();
}

// Clear all active tags
function clearAllTags() {
  activeTags = [];
  document.querySelectorAll(".tag").forEach((tagElement) => {
    tagElement.classList.remove("active");
  });

  updateFilterStatus();
  filterContent();
}

// Update filter status text
function updateFilterStatus() {
  const filterStatus = document.getElementById("filter-status");

  if (activeTags.length === 0) {
    filterStatus.textContent = "Showing all content";
  } else {
    filterStatus.textContent = `Filtering by: ${activeTags.join(", ")}`;
  }
}

// Render a specific content section
function renderContentSection(sectionId, items) {
  const container = document.getElementById(`${sectionId}-container`);
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-message">No ${sectionId} available</div>`;
    return;
  }

  items.forEach((item) => {
    const contentItem = document.createElement("li");
    contentItem.className = "content-item";
    contentItem.dataset.id = item.id || item.pid || "";
    contentItem.dataset.topics = JSON.stringify(item.topics || []);

    let html = `<a href="${item.link}" class="content-link">`;
    html += `<h3 class="content-title">${item.title}</h3>`;

    if (item.date) {
      html += `<div class="content-date">${item.date}</div>`;
    }

    if (item.description) {
      html += `<div class="content-description">${item.description}</div>`;
    }

    html += "</a>";

    if (item.topics && item.topics.length > 0) {
      html += '<div class="content-item-tags">';
      item.topics.forEach((topic) => {
        html += `<span class="content-item-tag">${topic}</span>`;
      });
      html += "</div>";
    }

    contentItem.innerHTML = html;
    container.appendChild(contentItem);
  });
}

// Render all content sections
function renderContent() {
  contentSections.forEach((section) => {
    renderContentSection(section, blogData[section] || []);
  });
}

// Filter content based on active tags
function filterContent() {
  const contentItems = document.querySelectorAll(".content-item");

  contentItems.forEach((item) => {
    const itemTopics = JSON.parse(item.dataset.topics || "[]");

    if (activeTags.length === 0) {
      item.style.display = "list-item";
      return;
    }

    const hasAllTags = activeTags.every((tag) => itemTopics.includes(tag));
    item.style.display = hasAllTags ? "list-item" : "none";
  });

  checkEmptySections();
}

// Check if sections are empty after filtering
function checkEmptySections() {
  contentSections.forEach((section) => {
    const container = document.getElementById(`${section}-container`);
    const visibleItems = Array.from(container.querySelectorAll(".content-item"))
      .filter(item => item.style.display !== "none");

    const existingMessage = container.querySelector(".empty-message");
    if (existingMessage) {
      existingMessage.remove();
    }

    if (visibleItems.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";
      emptyMessage.textContent = `No ${section} matching the selected tags`;
      container.appendChild(emptyMessage);
    }
  });
}
