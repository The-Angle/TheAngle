(function () {
  const STORAGE_KEY = 'angleAdminPosts';

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function readPosts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  function publishedPosts() {
    return readPosts()
      .filter(function (post) {
        return post && post.status === 'published';
      })
      .sort(function (a, b) {
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      });
  }

  function fallbackImage(category) {
    const images = {
      Elections: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      Perspectives: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      Podcast: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      Articles: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    };

    return images[category] || images.Articles;
  }

  function createStoryCard(post) {
    const action = post.category === 'Podcast' ? 'Listen' : 'Read More';
    const image = post.image || fallbackImage(post.category);
    const href = post.url || 'Articles.html';

    return `
      <article class="story-card admin-story-card">
        <div class="story-image" style="background-image: url('${escapeHtml(image)}');"></div>
        <div class="story-content">
          <div class="story-category">${escapeHtml(post.category || 'Articles')}</div>
          <h3 class="story-title">${escapeHtml(post.title)}</h3>
          <p class="story-excerpt">${escapeHtml(post.excerpt)}</p>
          <div class="story-meta"><span>${escapeHtml(post.author)}</span> <span>${escapeHtml(post.date)}</span></div>
          <a href="${escapeHtml(href)}" class="read-more">${action} &rarr;</a>
        </div>
      </article>
    `;
  }

  function createArticleCard(post) {
    const image = post.image || fallbackImage(post.category);
    const href = post.url || '#';

    return `
      <article class="episode-card admin-episode-card">
        <div class="episode-image" style="background-image: url('${escapeHtml(image)}');">
          <div class="episode-category">${escapeHtml(post.category || 'Articles')}</div>
        </div>
        <div class="episode-content">
          <h3 class="episode-title">${escapeHtml(post.title)}</h3>
          <div class="episode-meta">
            <span class="episode-host">${escapeHtml(post.author)}</span>
            <span class="episode-date">${escapeHtml(post.date)}</span>
          </div>
          <p class="episode-excerpt">${escapeHtml(post.excerpt)}</p>
          <a href="${escapeHtml(href)}" class="listen-now">Read Now</a>
        </div>
      </article>
    `;
  }

  function render() {
    const posts = publishedPosts();
    if (!posts.length) return;

    const featuredGrid = document.querySelector('[data-admin-content="featured"]');
    if (featuredGrid) {
      featuredGrid.insertAdjacentHTML('afterbegin', posts.slice(0, 3).map(createStoryCard).join(''));
    }

    const articleGrid = document.querySelector('[data-admin-content="articles"]');
    if (articleGrid) {
      articleGrid.insertAdjacentHTML('afterbegin', posts.map(createArticleCard).join(''));
    }
  }

  document.addEventListener('DOMContentLoaded', render);
})();
