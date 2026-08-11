(function () {
  const STORAGE_KEY = 'angleAdminPosts';
  const POSTS_API = '/api/posts';

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

  function readLocalPosts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  function saveLocalPosts(posts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }

  async function readPosts() {
    try {
      const response = await fetch(POSTS_API, { cache: 'no-store' });
      if (!response.ok) throw new Error('Posts API unavailable.');
      const posts = await response.json();
      if (!Array.isArray(posts)) throw new Error('Invalid posts payload.');
      const localPosts = readLocalPosts();
      if (!posts.length && localPosts.length) return localPosts;
      saveLocalPosts(posts);
      return posts;
    } catch (error) {
      return readLocalPosts();
    }
  }

  async function publishedPosts() {
    const posts = await readPosts();

    return posts
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
    const action = post.pdfData ? 'Open PDF' : (post.category === 'Podcast' ? 'Listen' : 'Read More');
    const image = post.image || fallbackImage(post.category);
    const href = post.pdfData || post.url || `Article.html?id=${encodeURIComponent(post.id)}`;
    const isGeneratedArticle = !post.pdfData && !post.url;
    const target = isGeneratedArticle ? '' : ' target="_blank" rel="noopener"';

    return `
      <article class="story-card admin-story-card">
        <div class="story-image" style="background-image: url('${escapeHtml(image)}');"></div>
        <div class="story-content">
          <div class="story-category">${escapeHtml(post.category || 'Articles')}</div>
          <h3 class="story-title">${escapeHtml(post.title)}</h3>
          <p class="story-excerpt">${escapeHtml(post.excerpt || post.content)}</p>
          <div class="story-meta"><span>${escapeHtml(post.author)}</span> <span>${escapeHtml(post.date)}</span></div>
          <a href="${escapeHtml(href)}" class="read-more"${target}>${action} &rarr;</a>
        </div>
      </article>
    `;
  }

  function createArticleCard(post) {
    const image = post.image || fallbackImage(post.category);
    const href = post.pdfData || post.url || `Article.html?id=${encodeURIComponent(post.id)}`;
    const action = post.pdfData ? 'Open PDF' : 'Read Now';
    const isGeneratedArticle = !post.pdfData && !post.url;
    const target = isGeneratedArticle ? '' : ' target="_blank" rel="noopener"';

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
          <p class="episode-excerpt">${escapeHtml(post.excerpt || post.content)}</p>
          <a href="${escapeHtml(href)}" class="listen-now"${target}>${action}</a>
        </div>
      </article>
    `;
  }

  function paragraphHtml(value) {
    return escapeHtml(value)
      .split(/\n{2,}/)
      .map(function (paragraph) {
        return paragraph.trim();
      })
      .filter(Boolean)
      .map(function (paragraph) {
        return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');
  }

  async function renderArticleDetail() {
    const detail = document.querySelector('[data-admin-article-detail]');
    if (!detail) return false;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const post = (await publishedPosts()).find(function (item) {
      return item.id === id;
    });

    if (!post) {
      detail.innerHTML = `
        <div class="article-container">
          <p class="article-kicker">Article unavailable</p>
          <h1>We could not find this published article.</h1>
          <p class="article-intro">It may have been unpublished or removed from the admin posts.</p>
          <a class="article-back-link" href="Articles.html">Back to Articles</a>
        </div>
      `;
      document.title = 'Article unavailable | The Angle Africa';
      return true;
    }

    const image = post.image || fallbackImage(post.category);
    document.title = `${post.title} | The Angle Africa`;
    detail.innerHTML = `
      <section class="hero-section" style="background-image: linear-gradient(135deg, rgba(107, 39, 42, 0.88) 0%, rgba(18, 18, 18, 0.78) 100%), url('${escapeHtml(image)}');">
        <div class="hero-content">
          <span class="hero-category">${escapeHtml(post.category || 'Articles')}</span>
          <h1 class="hero-title">${escapeHtml(post.title)}</h1>
          <p class="hero-subtitle">${escapeHtml(post.excerpt || '')}</p>
          <div class="hero-meta">
            <div class="hero-author">
              <span><strong>${escapeHtml(post.author)}</strong></span>
            </div>
            <div class="hero-date">
              <i class="far fa-calendar"></i>
              <span>${escapeHtml(post.date || '')}</span>
            </div>
          </div>
        </div>
      </section>
      <section class="article-section">
        <div class="article-container">
          <a class="back-button" href="Articles.html"><i class="fas fa-arrow-left"></i> Back to Articles</a>
          ${post.excerpt ? `<div class="article-intro">${escapeHtml(post.excerpt)}</div>` : ''}
          <div class="article-copy">${paragraphHtml(post.content || post.excerpt || '')}</div>
        </div>
      </section>
    `;
    return true;
  }

  async function render() {
    if (await renderArticleDetail()) return;

    const posts = await publishedPosts();
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
