(function () {
  const STORAGE_KEY = 'angleAdminPosts';
  const DELETED_KEY = 'angleAdminDeletedPosts';
  const TAGS_KEY = 'angleAdminTags';
  const HOMEPAGE_KEY = 'angleHomepageSettings';
  const POSTS_API = '/api/posts';
  const TAGS_API = '/api/tags';
  const HOMEPAGE_API = '/api/homepage';
  const POSTS_JSON = 'data/admin-posts.json';
  const TAGS_JSON = 'data/admin-tags.json';
  const HOMEPAGE_JSON = 'data/homepage-settings.json';
  const AUTHOR_PLACEHOLDER = 'assets/svg/author-placeholder.svg';

  const homepageDefaults = {
    heroCategory: 'Elections',
    heroKicker: 'Featured Analysis',
    heroTitle: 'Are African elections manipulated by foreign disinformation campaigns?',
    heroAuthor: 'Tom Mboya',
    heroDate: 'Apr 17, 2024',
    heroExcerpt: '2024 is touted as the biggest election year in history. More than 80 national elections are scheduled to take place, affecting the lives of billions of people globally.',
    heroUrl: 'Elections/African.html',
    featuredTitle: 'Articles',
    podcastTitle: 'Podcast',
    podcastSubtitle: 'Watch recent podcast videos featuring conversations with African builders, creators, and technology leaders.'
  };

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

  function readLocal(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function readDeletedIds() {
    try {
      return JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  function filterDeletedPosts(posts) {
    const deletedIds = new Set(readDeletedIds());
    return (posts || []).filter(function (post) {
      return post && post.id && !deletedIds.has(post.id);
    });
  }

  function mergePosts(primaryPosts, secondaryPosts) {
    const postsById = new Map();
    const deletedIds = new Set(readDeletedIds());

    (secondaryPosts || []).concat(primaryPosts || []).forEach(function (post) {
      if (!post || !post.id) return;
      if (deletedIds.has(post.id)) return;
      const existing = postsById.get(post.id);
      const postTime = new Date(post.updatedAt || post.createdAt || 0).getTime();
      const existingTime = existing ? new Date(existing.updatedAt || existing.createdAt || 0).getTime() : -1;

      if (!existing || postTime >= existingTime) {
        postsById.set(post.id, post);
      }
    });

    return Array.from(postsById.values());
  }

  async function readPosts() {
    try {
      const response = await fetch(POSTS_API, { cache: 'no-store' });
      if (!response.ok) throw new Error('Posts API unavailable.');
      const posts = await response.json();
      if (!Array.isArray(posts)) throw new Error('Invalid posts payload.');
      const serverPosts = filterDeletedPosts(posts);
      saveLocalPosts(serverPosts);
      return serverPosts;
    } catch (error) {
      try {
        const response = await fetch(POSTS_JSON, { cache: 'no-store' });
        if (!response.ok) throw new Error('Posts JSON unavailable.');
        const posts = await response.json();
        if (!Array.isArray(posts)) throw new Error('Invalid posts JSON payload.');
        const jsonPosts = filterDeletedPosts(posts);
        saveLocalPosts(jsonPosts);
        return jsonPosts;
      } catch (jsonError) {
        return filterDeletedPosts(readLocalPosts());
      }
    }
  }

  async function fetchJson(apiUrl, jsonUrl, fallback) {
    try {
      const response = await fetch(apiUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('API unavailable.');
      return await response.json();
    } catch (error) {
      try {
        const response = await fetch(jsonUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error('JSON unavailable.');
        return await response.json();
      } catch (jsonError) {
        return fallback;
      }
    }
  }

  async function readTags() {
    const localTags = readLocal(TAGS_KEY, []);
    const tags = await fetchJson(TAGS_API, TAGS_JSON, localTags);
    return Array.isArray(tags) ? tags : localTags;
  }

  async function readHomepage() {
    const localHomepage = readLocal(HOMEPAGE_KEY, {});
    const homepage = await fetchJson(HOMEPAGE_API, HOMEPAGE_JSON, localHomepage);
    return Object.assign({}, homepageDefaults, localHomepage || {}, homepage || {});
  }

  async function publishedPosts() {
    const posts = await readPosts();

    return posts
      .filter(function (post) {
        return post && post.status === 'published';
      })
      .sort(function (a, b) {
        return new Date(b.publishDate || b.updatedAt || b.createdAt || 0) - new Date(a.publishDate || a.updatedAt || a.createdAt || 0);
      });
  }

  function fallbackImage(category) {
    const images = {
      Elections: 'assets/svg/elections-placeholder.svg',
      Perspectives: 'assets/svg/perspectives-placeholder.svg',
      Podcast: 'assets/svg/podcast-placeholder.svg',
      Policy: 'assets/svg/policy-placeholder.svg',
      Articles: 'assets/svg/article-placeholder.svg'
    };

    return images[category] || images.Articles;
  }

  function isExternalUrl(value) {
    return /^https?:\/\//i.test(String(value || '').trim());
  }

  function hasYoutubeUrl(value) {
    return Boolean(youtubeVideoId(value));
  }

  function slugify(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90);
  }

  function postSlug(post) {
    return slugify(post && (post.slug || post.title || post.id));
  }

  function articleDetailHref(post) {
    if (post && post.slug) return `Article.html?slug=${encodeURIComponent(post.slug)}`;
    return `Article.html?id=${encodeURIComponent(post.id)}`;
  }

  function postHref(post) {
    if (post.pdfData) return post.pdfData;
    if (isExternalUrl(post.url) && !hasYoutubeUrl(post.url)) return post.url;
    return articleDetailHref(post);
  }

  function linkTarget(post) {
    return post.pdfData || (isExternalUrl(post.url) && !hasYoutubeUrl(post.url)) ? ' target="_blank" rel="noopener"' : '';
  }

  function createStoryCard(post) {
    const action = post.pdfData ? 'Open PDF' : (post.category === 'Podcast' ? 'Listen' : 'Read More');
    const image = post.image || fallbackImage(post.category);
    const href = postHref(post);
    const target = linkTarget(post);
    const tags = tagHtml(post);

    return `
      <a class="story-card admin-story-card" href="${escapeHtml(href)}"${target} aria-label="Read ${escapeHtml(post.title)}">
        <div class="story-image" style="background-image: url('${escapeHtml(image)}');"></div>
        <div class="story-content">
          <div class="story-category">${escapeHtml(post.category || 'Articles')}</div>
          <h3 class="story-title">${escapeHtml(post.title)}</h3>
          <p class="story-excerpt">${escapeHtml(post.excerpt || post.content)}</p>
          ${tags}
          <div class="story-meta"><span>${escapeHtml(post.author)}</span></div>
          <span class="read-more">${action} &rarr;</span>
        </div>
      </a>
    `;
  }

  function createArticleCard(post) {
    const image = post.image || fallbackImage(post.category);
    const href = postHref(post);
    const action = post.pdfData ? 'Open PDF' : 'Read More &rarr;';
    const target = linkTarget(post);
    const tags = tagHtml(post);

    return `
      <a class="article-card admin-article-card" href="${escapeHtml(href)}"${target} aria-label="Read ${escapeHtml(post.title)}">
        <div class="article-image" style="background-image: url('${escapeHtml(image)}');">
          <div class="article-category">${escapeHtml(post.category || 'Articles')}</div>
        </div>
        <div class="article-content">
          <h3 class="article-title">${escapeHtml(post.title)}</h3>
          <div class="article-meta">
            <span class="article-author">${escapeHtml(post.author)}</span>
          </div>
          <p class="article-excerpt">${escapeHtml(post.excerpt || post.content)}</p>
          ${tags}
          <span class="read-more">${action}</span>
        </div>
      </a>
    `;
  }

  function paragraphHtml(value) {
    function isHeadingLine(line) {
      return line.length <= 100 &&
        /^[A-Z0-9]/.test(line) &&
        !/[,:;]$/.test(line) &&
        !/[.!?]$/.test(line);
    }

    function paragraphBodyHtml(lines) {
      return `<p>${lines.join('<br>')}</p>`;
    }

    return escapeHtml(value)
      .split(/\n{2,}/)
      .map(function (paragraph) {
        return paragraph.trim();
      })
      .filter(Boolean)
      .map(function (paragraph) {
        const lines = paragraph.split('\n').map(function (line) {
          return line.trim();
        }).filter(Boolean);
        const firstLine = lines[0] || '';
        const h3 = firstLine.match(/^###\s+(.+)$/);
        const h2 = firstLine.match(/^##\s+(.+)$/);
        const bodyLines = lines.slice(1);

        if (h3) {
          return `<h3>${h3[1]}</h3>${bodyLines.length ? paragraphBodyHtml(bodyLines) : ''}`;
        }

        if (h2) {
          return `<h2>${h2[1]}</h2>${bodyLines.length ? paragraphBodyHtml(bodyLines) : ''}`;
        }

        if (lines.length > 1 && isHeadingLine(firstLine)) {
          return `<h2>${firstLine}</h2>${paragraphBodyHtml(bodyLines)}`;
        }

        if (lines.length === 1 && isHeadingLine(firstLine)) {
          return `<h2>${firstLine}</h2>`;
        }

        return paragraphBodyHtml(lines);
      })
      .join('');
  }

  function youtubeVideoId(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, '');

      if (host === 'youtu.be') {
        return url.pathname.split('/').filter(Boolean)[0] || '';
      }

      if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
        if (url.pathname === '/watch') return url.searchParams.get('v') || '';
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') return parts[1] || '';
      }
    } catch (error) {
      return raw.match(/^[a-zA-Z0-9_-]{11}$/) ? raw : '';
    }

    return raw.match(/^[a-zA-Z0-9_-]{11}$/) ? raw : '';
  }

  function postVideoUrl(post) {
    return post.videoUrl || post.youtubeUrl || post.youtube || post.video || (hasYoutubeUrl(post.url) ? post.url : '');
  }

  function youtubeEmbedHtml(post) {
    const id = youtubeVideoId(postVideoUrl(post));
    if (!id) return '';
    const origin = window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '';
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      playsinline: '1'
    });

    if (origin) params.set('origin', origin);

    return `
      <div class="article-video">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}?${escapeHtml(params.toString())}"
          title="${escapeHtml(post.title || 'The Angle video')}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen></iframe>
      </div>
    `;
  }

  function createPodcastVideoCard(post) {
    const id = youtubeVideoId(postVideoUrl(post));
    if (!id) return createStoryCard(post);
    const title = post.title || 'The Angle Podcast';
    const description = post.excerpt || post.content || 'Watch the latest conversation from The Angle Podcast.';

    return `
      <article class="story-card admin-story-card">
        <div class="video-embed">
          <iframe
            src="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}?rel=0"
            title="${escapeHtml(title)}"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen></iframe>
        </div>
        <div class="story-content">
          <div class="story-category">Podcast</div>
          <h3 class="story-title">${escapeHtml(title)}</h3>
          <p class="story-excerpt">${escapeHtml(truncate(description, 150))}</p>
          <div class="story-meta"><span>${escapeHtml(post.author || 'The Angle')}</span></div>
          <a href="https://www.youtube.com/watch?v=${escapeHtml(id)}" target="_blank" rel="noopener" class="read-more">Open on YouTube →</a>
        </div>
      </article>
    `;
  }

  function authorCardHtml(post) {
    if (!post.authorBio && !post.authorTitle && !post.authorEmail && !post.authorPicture) return '';
    const picture = post.authorPicture || AUTHOR_PLACEHOLDER;

    return `
      <section class="author-card" aria-label="Author bio">
        <div class="author-card-inner">
          <img class="author-picture" src="${escapeHtml(picture)}" alt="">
          <div>
            <h2>${escapeHtml(post.author || 'The Angle')}</h2>
            ${post.authorEmail ? `<div class="author-title">${escapeHtml(post.authorEmail)}</div>` : ''}
            ${post.authorTitle ? `<div class="author-title">${escapeHtml(post.authorTitle)}</div>` : ''}
            ${post.authorBio ? `<p class="author-bio">${escapeHtml(post.authorBio)}</p>` : ''}
          </div>
        </div>
      </section>
    `;
  }

  function postTagIds(post) {
    const rawTags = Array.isArray(post && post.tags) ? post.tags : [];
    return rawTags.map(function (tag) {
      if (typeof tag === 'string') return tag;
      return tag && (tag.id || tag.slug || tag.name);
    }).filter(Boolean);
  }

  function tagLabel(postTag, post) {
    const names = post && post.tagNames;
    if (Array.isArray(names)) {
      const index = postTagIds(post).indexOf(postTag);
      if (names[index]) return names[index];
    }
    return String(postTag || '').replace(/-/g, ' ');
  }

  function tagHtml(post) {
    const tags = postTagIds(post);
    if (!tags.length) return '';

    return `
      <div class="article-tags">
        ${tags.map(function (tag) {
          return `<span>${escapeHtml(tagLabel(tag, post))}</span>`;
        }).join('')}
      </div>
    `;
  }

  function truncate(value, maxLength) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}...`;
  }

  function articleFigureHtml(post) {
    const image = post.image || fallbackImage(post.category);
    const caption = post.imageCaption || post.subtitle || post.excerpt || `Featured image for ${post.title}`;

    return `
      <figure class="article-feature-image">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(post.imageAlt || post.title)}">
        <figcaption>${escapeHtml(truncate(caption, 130))}</figcaption>
      </figure>
    `;
  }

  function relatedCardHtml(item) {
    const href = item.href || postHref(item);
    const target = item.href ? '' : linkTarget(item);

    return `
      <article class="related-card">
        <a href="${escapeHtml(href)}"${target} aria-label="Read ${escapeHtml(item.title)}">
          <img src="${escapeHtml(item.image || fallbackImage(item.category))}" alt="${escapeHtml(item.title)}">
          <div class="related-card-content">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(truncate(item.excerpt || item.content || '', 140))}</p>
            <div class="related-card-meta">
              <span>${escapeHtml(item.category || 'Articles')}</span>
            </div>
          </div>
        </a>
      </article>
    `;
  }

  function relatedArticlesHtml(post, posts) {
    const fallbackRelated = [
      {
        href: 'Elections/E-Voting.html',
        title: 'E-voting versus paper ballots: The technology debate',
        category: 'Elections',
        date: 'May 19, 2024',
        excerpt: 'Examining the pros and cons of electronic voting systems compared to traditional paper ballots in African contexts.',
        image: 'assets/svg/elections-placeholder.svg'
      },
      {
        href: 'Perspectives/Unlocking.html',
        title: "Unlocking Africa's digital potential",
        category: 'Technology',
        date: 'September 2, 2024',
        excerpt: 'Addressing challenges and charting a path forward for digital transformation across the continent.',
        image: 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
      },
      {
        href: 'Elections/Politicians.html',
        title: 'Building trust in electoral systems',
        category: 'Governance',
        date: 'August 15, 2024',
        excerpt: 'How transparency and accountability can restore confidence in democratic processes across Africa.',
        image: 'assets/svg/elections-placeholder.svg'
      }
    ];
    const adminRelated = (posts || [])
      .filter(function (item) {
        return item.id !== post.id;
      })
      .slice(0, 3);
    const related = adminRelated.concat(fallbackRelated).slice(0, 3);

    return `
      <section class="related-section">
        <div class="container">
          <h2 class="section-title">Related Articles</h2>
          <div class="related-grid">
            ${related.map(relatedCardHtml).join('')}
          </div>
        </div>
      </section>
    `;
  }

  function connectSectionHtml() {
    return `
      <section class="connect-section">
        <div class="container">
          <h2 class="section-title" style="color: black;">Connect With Us</h2>
          <div class="connect-grid">
            <div class="connect-card">
              <h3>Stay Updated</h3>
              <p>Subscribe to our newsletter for the latest insights on African digital culture, creativity, and innovation.</p>
              <div class="platform-links">
                <a href="https://theangleafrica.substack.com/?utm_source=global-search" class="platform-link" target="_blank" rel="noopener">Subscribe to Newsletter</a>
              </div>
            </div>
            <div class="connect-card">
              <h3>Listen to Our Podcast</h3>
              <p>Available on all major podcast platforms</p>
              <div class="platform-links">
                <a href="https://open.spotify.com/show/2ScSSilPfkwK0DgXZDQR07?si=c93b4312a15e4e51" class="platform-link" target="_blank" rel="noopener">Spotify</a>
                <a href="https://youtube.com/@theangle.afrika?si=TToWFrhG_6htYPEq" class="platform-link" target="_blank" rel="noopener">YouTube</a>
                <a href="https://theangleafrica.substack.com/?utm_source=global-search" class="platform-link" target="_blank" rel="noopener">Substack</a>
              </div>
            </div>
            <div class="connect-card">
              <h3>Follow Our Updates</h3>
              <p>Stay connected on social media for daily updates and community discussions</p>
              <div class="social-links">
                <a href="https://x.com/TheAngle_Afrika" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a>
                <a href="https://www.instagram.com/theangle.afrika/" target="_blank" rel="noopener"><i class="fab fa-instagram"></i></a>
                <a href="https://linkedin.com/the-angle-africa" target="_blank" rel="noopener"><i class="fab fa-linkedin-in"></i></a>
                <a href="https://www.tiktok.com/@the.angle.podcast" target="_blank" rel="noopener"><i class="fab fa-tiktok"></i></a>
                <a href="https://web.facebook.com/people/The-Angle-Africa/61569042767052/" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a>
              </div>
              <div class="contact-info">
                <p><i class="fas fa-map-marker-alt"></i> 41 Juta Street, Braamfontein</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function absoluteUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return window.location.href;
    if (/^data:/i.test(raw)) return raw;

    try {
      return new URL(raw, window.location.href).href;
    } catch (error) {
      return window.location.href;
    }
  }

  function upsertHeadElement(selector, tagName, attributes, textContent) {
    let element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement(tagName);
      document.head.appendChild(element);
    }

    Object.keys(attributes || {}).forEach(function (key) {
      element.setAttribute(key, attributes[key]);
    });

    if (typeof textContent === 'string') {
      element.textContent = textContent;
    }
  }

  function setMetaName(name, content) {
    upsertHeadElement(`meta[name="${name}"]`, 'meta', { name: name, content: content });
  }

  function setMetaProperty(property, content) {
    upsertHeadElement(`meta[property="${property}"]`, 'meta', { property: property, content: content });
  }

  function setArticleSeo(post, image) {
    const title = post.metaTitle || post.title || 'Article';
    const description = truncate(post.metaDescription || post.excerpt || post.content || '', 160);
    const url = absoluteUrl(articleDetailHref(post));
    const imageUrl = absoluteUrl(image);
    const publishedDate = post.publishDate || post.createdAt || post.updatedAt || '';

    document.title = `${title} | The Angle Africa`;
    setMetaName('description', description);
    upsertHeadElement('link[rel="canonical"]', 'link', { rel: 'canonical', href: url });

    setMetaProperty('og:type', 'article');
    setMetaProperty('og:title', title);
    setMetaProperty('og:description', description);
    setMetaProperty('og:url', url);
    setMetaProperty('og:image', imageUrl);
    setMetaProperty('og:site_name', 'The Angle Africa');

    setMetaName('twitter:card', 'summary_large_image');
    setMetaName('twitter:title', title);
    setMetaName('twitter:description', description);
    setMetaName('twitter:image', imageUrl);

    upsertHeadElement('script[data-admin-schema="article"]', 'script', {
      type: 'application/ld+json',
      'data-admin-schema': 'article'
    }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': post.category === 'Podcast' ? 'Article' : 'NewsArticle',
      headline: post.title || title,
      description: description,
      image: [imageUrl],
      datePublished: publishedDate,
      dateModified: post.updatedAt || publishedDate,
      author: {
        '@type': 'Person',
        name: post.author || 'The Angle Africa',
        email: post.authorEmail || undefined,
        image: post.authorPicture ? absoluteUrl(post.authorPicture) : undefined
      },
      publisher: {
        '@type': 'Organization',
        name: 'The Angle Africa'
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url
      }
    }));
  }

  async function renderArticleDetail() {
    const detail = document.querySelector('[data-admin-article-detail]');
    if (!detail) return false;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const slug = slugify(params.get('slug'));
    const posts = await publishedPosts();
    const post = posts.find(function (item) {
      return (slug && postSlug(item) === slug) || item.id === id;
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
    setArticleSeo(post, image);
    detail.innerHTML = `
      <section class="hero-section">
        <img class="hero-bg-image" src="${escapeHtml(image)}" alt="">
        <div class="hero-content">
          <span class="hero-category">${escapeHtml(post.category || 'Articles')}</span>
          <h1 class="hero-title">${escapeHtml(post.title)}</h1>
          <div class="hero-meta">
            <div class="hero-author">
              <span>By ${escapeHtml(post.author || 'The Angle Africa')}</span>
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
          <div class="hero-meta" style="justify-content: flex-start; color: var(--text-light); margin-bottom: 24px;">
            <div class="hero-author">
              <span><strong>${escapeHtml(post.author)}</strong></span>
            </div>
            <div class="hero-date">
              <i class="far fa-calendar"></i>
              <span>${escapeHtml(post.date || '')}</span>
            </div>
          </div>
          ${post.excerpt ? `<div class="article-intro">${escapeHtml(post.excerpt)}</div>` : ''}
          ${tagHtml(post)}
          ${articleFigureHtml(post)}
          ${youtubeEmbedHtml(post)}
          <div class="article-copy">${paragraphHtml(post.content || post.excerpt || '')}</div>
          ${authorCardHtml(post)}
        </div>
      </section>
      ${relatedArticlesHtml(post, posts)}
      ${connectSectionHtml()}
    `;
    return true;
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element && value) element.textContent = value;
  }

  function renderHomepageHeadlines(settings) {
    if (!document.querySelector('[data-homepage-hero-title]')) return;
    const homepage = Object.assign({}, homepageDefaults, settings || {});

    setText('[data-homepage-hero-category]', homepage.heroCategory);
    setText('[data-homepage-hero-kicker]', homepage.heroKicker);
    setText('[data-homepage-hero-title]', homepage.heroTitle);
    setText('[data-homepage-hero-author]', homepage.heroAuthor);
    setText('[data-homepage-hero-date]', homepage.heroDate);
    setText('[data-homepage-hero-excerpt]', homepage.heroExcerpt);
    setText('[data-homepage-featured-title]', homepage.featuredTitle);
    setText('[data-homepage-podcast-title]', homepage.podcastTitle);
    setText('[data-homepage-podcast-subtitle]', homepage.podcastSubtitle);

    const heroLink = document.querySelector('[data-homepage-hero-link]');
    if (heroLink && homepage.heroUrl) heroLink.setAttribute('href', homepage.heroUrl);
  }

  function renderMainStory(posts) {
    const heroTitle = document.querySelector('[data-homepage-hero-title]');
    if (!heroTitle) return;

    const mainPost = (posts || []).find(function (post) {
      return post.category === 'Main';
    });
    if (!mainPost) return;

    const image = mainPost.image || fallbackImage(mainPost.category);
    const heroImage = document.querySelector('[data-homepage-hero-image]');
    const heroLink = document.querySelector('[data-homepage-hero-link]');

    setText('[data-homepage-hero-category]', mainPost.category || 'Main');
    setText('[data-homepage-hero-kicker]', mainPost.tagNames && mainPost.tagNames[0] ? mainPost.tagNames[0] : 'Featured Analysis');
    setText('[data-homepage-hero-title]', mainPost.title);
    setText('[data-homepage-hero-author]', mainPost.author || 'The Angle');
    setText('[data-homepage-hero-excerpt]', mainPost.excerpt || mainPost.content || '');

    if (heroImage && image) {
      heroImage.style.backgroundImage = `url('${image.replace(/'/g, "\\'")}')`;
      heroImage.setAttribute('aria-label', mainPost.imageAlt || mainPost.title || 'Featured story image');
    }

    if (heroLink) {
      heroLink.setAttribute('href', postHref(mainPost));
      if (linkTarget(mainPost)) {
        heroLink.setAttribute('target', '_blank');
        heroLink.setAttribute('rel', 'noopener');
      } else {
        heroLink.removeAttribute('target');
        heroLink.removeAttribute('rel');
      }
    }
  }

  function renderPodcastPosts(posts) {
    const podcastGrid = document.querySelector('[data-admin-content="podcasts"]');
    if (!podcastGrid) return;

    const podcasts = posts.filter(function (post) {
      return post.category === 'Podcast' && youtubeVideoId(postVideoUrl(post));
    }).slice(0, 4);

    if (podcasts.length) {
      podcastGrid.innerHTML = podcasts.map(createPodcastVideoCard).join('');
    }
  }

  function tagMatches(post, tag) {
    const tagIds = postTagIds(post);
    return tagIds.some(function (tagId) {
      return tagId === tag.id || tagId === tag.slug || tagId === tag.name;
    });
  }

  function renderTagSections(posts, tags) {
    const target = document.querySelector('[data-admin-content="tag-sections"]');
    if (!target || !Array.isArray(tags) || !tags.length) return;

    const sections = tags.map(function (tag) {
      const taggedPosts = posts.filter(function (post) {
        return tagMatches(post, tag);
      }).slice(0, 3);
      if (!taggedPosts.length) return '';

      return `
        <section class="tag-section" id="tag-${escapeHtml(tag.slug || tag.id)}">
          <div class="container">
            <div class="section-header">
              <h2 class="section-title">${escapeHtml(tag.name)}</h2>
              <a href="Articles.html" class="view-all">View All Stories</a>
            </div>
            <div class="stories-grid">
              ${taggedPosts.map(createStoryCard).join('')}
            </div>
          </div>
        </section>
      `;
    }).join('');

    target.innerHTML = sections;
  }

  async function render() {
    if (await renderArticleDetail()) return;

    const posts = await publishedPosts();
    const homepage = await readHomepage();
    const tags = await readTags();
    renderHomepageHeadlines(homepage);
    if (!posts.length) return;
    renderMainStory(posts);

    const featuredGrid = document.querySelector('[data-admin-content="featured"]');
    if (featuredGrid) {
      const latestArticles = posts.filter(function (post) {
        const title = String(post.title || '');
        return post.category !== 'Podcast' &&
          post.category !== 'Main' &&
          !/API Village|Africa Talking/i.test(title);
      }).slice(0, 6);

      if (latestArticles.length >= 6) {
        featuredGrid.innerHTML = latestArticles.map(createStoryCard).join('');
      }
    }

    const articleGrid = document.querySelector('[data-admin-content="articles"]');
    if (articleGrid) {
      articleGrid.insertAdjacentHTML('afterbegin', posts.map(createArticleCard).join(''));
    }

    renderPodcastPosts(posts);
    renderTagSections(posts, tags);
  }

  document.addEventListener('DOMContentLoaded', render);
})();
