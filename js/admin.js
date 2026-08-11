(function () {
  const STORAGE_KEY = 'angleAdminPosts';
  const DELETED_KEY = 'angleAdminDeletedPosts';
  const AUTHORS_KEY = 'angleAdminAuthors';
  const TAGS_KEY = 'angleAdminTags';
  const HOMEPAGE_KEY = 'angleHomepageSettings';
  const SESSION_KEY = 'angleAdminSession';
  const POSTS_API = '/api/posts';
  const AUTHORS_API = '/api/authors';
  const TAGS_API = '/api/tags';
  const HOMEPAGE_API = '/api/homepage';
  const POSTS_JSON = 'data/admin-posts.json';
  const AUTHORS_JSON = 'data/admin-authors.json';
  const TAGS_JSON = 'data/admin-tags.json';
  const HOMEPAGE_JSON = 'data/homepage-settings.json';
  const ADMIN_PIN = 'angle-admin';
  const IS_FILE_MODE = window.location.protocol === 'file:';
  const AUTHOR_PLACEHOLDER = 'assets/svg/author-placeholder.svg';

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const postForm = document.getElementById('post-form');
  const authorForm = document.getElementById('author-form');
  const tagForm = document.getElementById('tag-form');
  const homepageForm = document.getElementById('homepage-form');
  const postsList = document.getElementById('posts-list');
  const postsSearchType = document.getElementById('posts-search-type');
  const postsSearchInput = document.getElementById('posts-search');
  const postsSearchDate = document.getElementById('posts-search-date');
  const postsSearchTextField = document.getElementById('posts-search-text-field');
  const postsSearchDateField = document.getElementById('posts-search-date-field');
  const clearPostsSearch = document.getElementById('clear-posts-search');
  const authorsList = document.getElementById('authors-list');
  const tagsList = document.getElementById('tags-list');
  const postTagsList = document.getElementById('post-tags-list');
  const authorSelect = document.getElementById('post-author');
  const authorPreview = document.getElementById('post-author-preview');
  const statusMessages = document.querySelectorAll('.status-message');
  const formTitle = document.getElementById('form-title');
  const emptyState = document.getElementById('empty-state');
  const dashboardTools = document.getElementById('dashboard-tools');
  const adminHero = document.querySelector('.admin-hero');
  const storageWarning = document.getElementById('storage-warning');
  const deleteModal = document.getElementById('delete-modal');
  const cancelDeleteButton = document.getElementById('cancel-delete');
  const confirmDeleteButton = document.getElementById('confirm-delete');
  const pdfInput = document.getElementById('post-pdf');
  const pdfName = document.getElementById('post-pdf-name');
  const imageInput = document.getElementById('post-image-file');
  const imageName = document.getElementById('post-image-file-name');
  const authorPictureInput = document.getElementById('author-picture');
  const authorPictureName = document.getElementById('author-picture-name');
  const tabButtons = document.querySelectorAll('[data-tab-target]');
  const tabPanels = document.querySelectorAll('[data-tab-panel]');
  const counterLabels = document.querySelectorAll('[data-counter-for]');
  let pendingDeleteId = null;
  let postsCache = [];
  let authorsCache = [];
  let tagsCache = [];
  let homepageCache = {};
  let slugEdited = false;
  let metaTitleEdited = false;

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

  function readLocal(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function saveLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      setStatus('This browser could not store all admin data. Export or use the local admin server before publishing.');
      return false;
    }
  }

  function readLocalPosts() {
    return readLocal(STORAGE_KEY, []);
  }

  function saveLocalPosts(posts) {
    return saveLocal(STORAGE_KEY, posts);
  }

  function readDeletedIds() {
    return readLocal(DELETED_KEY, []);
  }

  function saveDeletedIds(ids) {
    saveLocal(DELETED_KEY, Array.from(new Set(ids || [])));
  }

  function rememberDeletedPost(id) {
    if (!id) return;
    saveDeletedIds(readDeletedIds().concat(id));
  }

  function forgetDeletedPost(id) {
    if (!id) return;
    saveDeletedIds(readDeletedIds().filter(function (deletedId) {
      return deletedId !== id;
    }));
  }

  function mergeById(primaryItems, secondaryItems) {
    const itemsById = new Map();

    (secondaryItems || []).concat(primaryItems || []).forEach(function (item) {
      if (!item || !item.id) return;
      const existing = itemsById.get(item.id);
      const itemTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      const existingTime = existing ? new Date(existing.updatedAt || existing.createdAt || 0).getTime() : -1;

      if (!existing || itemTime >= existingTime) {
        itemsById.set(item.id, item);
      }
    });

    return Array.from(itemsById.values());
  }

  function mergePosts(primaryPosts, secondaryPosts) {
    const deletedIds = new Set(readDeletedIds());
    return mergeById(primaryPosts, secondaryPosts).filter(function (post) {
      return post && post.id && !deletedIds.has(post.id);
    });
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

  async function readPosts() {
    const localPosts = readLocalPosts();
    const posts = await fetchJson(POSTS_API, POSTS_JSON, localPosts);
    const mergedPosts = mergePosts(localPosts, Array.isArray(posts) ? posts : []);
    postsCache = mergedPosts;
    saveLocalPosts(mergedPosts);
    return mergedPosts;
  }

  async function readAuthors() {
    const localAuthors = readLocal(AUTHORS_KEY, []);
    const authors = await fetchJson(AUTHORS_API, AUTHORS_JSON, localAuthors);
    authorsCache = mergeById(localAuthors, Array.isArray(authors) ? authors : []);
    saveLocal(AUTHORS_KEY, authorsCache);
    return authorsCache;
  }

  async function readTags() {
    const localTags = readLocal(TAGS_KEY, []);
    const tags = await fetchJson(TAGS_API, TAGS_JSON, localTags);
    tagsCache = mergeById(localTags, Array.isArray(tags) ? tags : []);
    saveLocal(TAGS_KEY, tagsCache);
    return tagsCache;
  }

  async function readHomepage() {
    const localHomepage = readLocal(HOMEPAGE_KEY, {});
    const homepage = await fetchJson(HOMEPAGE_API, HOMEPAGE_JSON, localHomepage);
    homepageCache = Object.assign({}, homepageDefaults, homepage || {}, localHomepage || {});
    saveLocal(HOMEPAGE_KEY, homepageCache);
    return homepageCache;
  }

  async function saveApi(apiUrl, payload) {
    if (IS_FILE_MODE) return 'file';

    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('API unavailable.');
      return 'api';
    } catch (error) {
      return 'local';
    }
  }

  async function savePosts(posts) {
    postsCache = posts;
    saveLocalPosts(posts);
    const mode = await saveApi(POSTS_API, posts);
    if (mode === 'file') {
      setStatus('Saved only in file explorer mode. Open http://127.0.0.1:8000/Admin.html through start-admin-server.bat before publishing to the website.');
    } else if (mode === 'local') {
      setStatus('Saved in this browser only. Export Posts, then replace data/admin-posts.json on Hostinger to update the website.');
    }
    return mode;
  }

  async function saveAuthors(authors) {
    authorsCache = authors;
    saveLocal(AUTHORS_KEY, authors);
    const mode = await saveApi(AUTHORS_API, authors);
    if (mode !== 'api') setStatus('Author saved locally. Use the admin server to persist it to data/admin-authors.json.');
    return mode;
  }

  async function saveTags(tags) {
    tagsCache = tags;
    saveLocal(TAGS_KEY, tags);
    const mode = await saveApi(TAGS_API, tags);
    if (mode !== 'api') setStatus('Tag saved locally. Use the admin server to persist it to data/admin-tags.json.');
    return mode;
  }

  async function saveHomepage(homepage) {
    homepageCache = homepage;
    saveLocal(HOMEPAGE_KEY, homepage);
    const mode = await saveApi(HOMEPAGE_API, homepage);
    if (mode !== 'api') setStatus('Homepage headlines saved locally. Use the admin server to persist them to data/homepage-settings.json.');
    return mode;
  }

  function setStatus(message) {
    statusMessages.forEach(function (statusMessage) {
      statusMessage.textContent = message;
    });
    window.setTimeout(function () {
      statusMessages.forEach(function (statusMessage) {
        statusMessage.textContent = '';
      });
    }, 5000);
  }

  function showStorageWarning() {
    if (!storageWarning) return;
    storageWarning.classList.toggle('active', IS_FILE_MODE);
  }

  async function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    dashboardTools.hidden = false;
    adminHero.classList.remove('login-mode');
    await Promise.all([readPosts(), readAuthors(), readTags(), readHomepage()]);
    renderAuthorOptions();
    renderTagChecklist();
    renderAuthors();
    renderTags();
    renderHomepageForm();
    await renderPosts(false);
  }

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
    dashboardTools.hidden = true;
    adminHero.classList.add('login-mode');
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function dateInputValue(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
    return date.toISOString().slice(0, 10);
  }

  function setElementText(element, value) {
    if (element) element.textContent = value;
  }

  function getField(id) {
    return document.getElementById(id);
  }

  function getFieldValue(id) {
    const field = getField(id);
    return field ? field.value.trim() : '';
  }

  function setFieldValue(id, value) {
    const field = getField(id);
    if (field) field.value = value || '';
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

  function uniqueSlug(value, posts, currentId) {
    const base = slugify(value) || 'article';
    let candidate = base;
    let index = 2;

    while ((posts || []).some(function (post) {
      return post && post.id !== currentId && postSlug(post) === candidate;
    })) {
      candidate = `${base}-${index}`;
      index += 1;
    }

    return candidate;
  }

  function updateCounter(id) {
    const field = getField(id);
    const label = document.querySelector(`[data-counter-for="${id}"]`);
    if (!field || !label) return;
    const max = field.getAttribute('maxlength');
    label.textContent = max ? `${field.value.length}/${max}` : String(field.value.length);
  }

  function updateCounters() {
    counterLabels.forEach(function (label) {
      updateCounter(label.dataset.counterFor);
    });
  }

  function activateTab(name) {
    tabButtons.forEach(function (button) {
      const active = button.dataset.tabTarget === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    tabPanels.forEach(function (panel) {
      panel.hidden = panel.dataset.tabPanel !== name;
    });
  }

  function activateTabForField(fieldId) {
    const field = getField(fieldId);
    const panel = field && field.closest('[data-tab-panel]');
    if (panel) activateTab(panel.dataset.tabPanel);
  }

  function syncHeadlineFields() {
    const title = getFieldValue('post-title');

    if (!slugEdited) {
      setFieldValue('post-slug', slugify(title));
    } else {
      setFieldValue('post-slug', slugify(getFieldValue('post-slug')));
    }

    if (!metaTitleEdited) {
      setFieldValue('post-meta-title', title.slice(0, 60));
    }

    updateCounters();
  }

  function selectedAuthor() {
    const id = getFieldValue('post-author');
    return authorsCache.find(function (author) {
      return author.id === id;
    }) || null;
  }

  function updateAuthorPreview(fallbackPost) {
    const author = selectedAuthor();
    const name = author ? author.name : (fallbackPost && fallbackPost.author) || 'No author selected';
    const email = author ? author.email : (fallbackPost && fallbackPost.authorEmail) || '';
    const bio = author ? author.bio : (fallbackPost && fallbackPost.authorBio) || 'Select an author to attach their email, bio, and picture to this article.';
    const picture = author ? author.picture : (fallbackPost && fallbackPost.authorPicture) || AUTHOR_PLACEHOLDER;

    if (!authorPreview) return;
    authorPreview.innerHTML = `
      <img src="${escapeHtml(picture || AUTHOR_PLACEHOLDER)}" alt="">
      <div>
        <strong>${escapeHtml(name)}</strong>
        ${email ? `<p class="field-hint">${escapeHtml(email)}</p>` : ''}
        <p class="field-hint">${escapeHtml(bio)}</p>
      </div>
    `;
  }

  function selectedTagIds() {
    return Array.from(document.querySelectorAll('input[name="post-tags"]:checked')).map(function (input) {
      return input.value;
    });
  }

  function postTagIds(post) {
    const rawTags = Array.isArray(post && post.tags) ? post.tags : [];
    return rawTags.map(function (tag) {
      if (typeof tag === 'string') return tag;
      return tag && (tag.id || tag.slug || tag.name);
    }).filter(Boolean);
  }

  function validationError(post) {
    const isPublishing = post.status === 'published';

    if (!post.title) return { message: 'Please add a headline.', field: 'post-title' };
    if (post.title.length > 100) return { message: 'Headline must be 100 characters or fewer.', field: 'post-title' };
    if (!post.slug) return { message: 'Please add a slug.', field: 'post-slug' };

    if (!isPublishing) {
      if (post.metaTitle && post.metaTitle.length > 60) return { message: 'Meta title must be 60 characters or fewer.', field: 'post-meta-title' };
      if (post.metaDescription && post.metaDescription.length > 160) return { message: 'Meta description must be 160 characters or fewer.', field: 'post-meta-description' };
      return null;
    }

    if (!post.author) return { message: 'Please choose an author before publishing.', field: 'post-author' };
    if (!post.category) return { message: 'Please choose a category before publishing.', field: 'post-category' };
    if (!post.date) return { message: 'Please add a publish date before publishing.', field: 'post-date' };
    if (!post.excerpt) return { message: 'Please add an excerpt before publishing.', field: 'post-excerpt' };
    if (!post.content) return { message: 'Please add the article body before publishing.', field: 'post-content' };
    if (!post.image) return { message: 'Please upload a featured image before publishing.', field: 'post-image-file' };
    if (!post.imageAlt) return { message: 'Please add featured image alt text before publishing.', field: 'post-image-alt' };
    if (!post.metaTitle) return { message: 'Please add a meta title before publishing.', field: 'post-meta-title' };
    if (post.metaTitle.length > 60) return { message: 'Meta title must be 60 characters or fewer.', field: 'post-meta-title' };
    if (!post.metaDescription) return { message: 'Please add a meta description before publishing.', field: 'post-meta-description' };
    if (post.metaDescription.length > 160) return { message: 'Meta description must be 160 characters or fewer.', field: 'post-meta-description' };

    return null;
  }

  function readPdfUpload() {
    if (!pdfInput) return Promise.resolve(null);
    const file = pdfInput.files && pdfInput.files[0];
    if (!file) return Promise.resolve(null);

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      return Promise.reject(new Error('Please choose a PDF document.'));
    }

    if (file.size > 3 * 1024 * 1024) {
      return Promise.reject(new Error('This browser-based admin can store PDFs up to 3MB. Use a smaller PDF or host the file and paste its URL.'));
    }

    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve({
          pdfData: reader.result,
          pdfName: file.name,
          pdfType: file.type || 'application/pdf'
        });
      };
      reader.onerror = function () {
        reject(new Error('The PDF could not be read. Please try again.'));
      };
      reader.readAsDataURL(file);
    });
  }

  function readImageUpload(input, label) {
    if (!input) return Promise.resolve(null);
    const file = input.files && input.files[0];
    if (!file) return Promise.resolve(null);

    const isImage = /^image\/(svg\+xml|png|jpeg|webp|gif)$/i.test(file.type) || /\.(svg|png|jpe?g|webp|gif)$/i.test(file.name);
    if (!isImage) {
      return Promise.reject(new Error(`Please choose an SVG, PNG, JPG, WEBP, or GIF ${label || 'image'}.`));
    }

    if (file.size > 3 * 1024 * 1024) {
      return Promise.reject(new Error(`This browser-based admin can store ${label || 'images'} up to 3MB. Please choose a smaller file.`));
    }

    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve({
          imageData: reader.result,
          imageName: file.name,
          imageType: file.type || 'image/*'
        });
      };
      reader.onerror = function () {
        reject(new Error('The image could not be read. Please try again.'));
      };
      reader.readAsDataURL(file);
    });
  }

  async function getFormData(status, existingPost, posts) {
    const pdfUpload = await readPdfUpload();
    const imageUpload = await readImageUpload(imageInput, 'featured image');
    const pdfData = pdfUpload ? pdfUpload.pdfData : (existingPost && existingPost.pdfData) || '';
    const pdfNameValue = pdfUpload ? pdfUpload.pdfName : (existingPost && existingPost.pdfName) || '';
    const imageValue = imageUpload ? imageUpload.imageData : ((existingPost && existingPost.image) || '');
    const imageNameValue = imageUpload ? imageUpload.imageName : (existingPost && existingPost.imageName) || '';
    const typedUrl = getFieldValue('post-url');
    const typedVideoUrl = getFieldValue('post-video');
    const id = getFieldValue('post-id') || String(Date.now());
    const title = getFieldValue('post-title');
    const selectedStatus = status || getFieldValue('post-status') || 'draft';
    const metaTitle = (getFieldValue('post-meta-title') || title).slice(0, 60);
    const dateValue = getFieldValue('post-date');
    const slug = uniqueSlug(getFieldValue('post-slug') || title, posts, id);
    const author = selectedAuthor();
    const fallbackAuthor = existingPost || {};
    const tags = selectedTagIds();

    return {
      id: id,
      title: title,
      slug: slug,
      category: getFieldValue('post-category') || 'Articles',
      authorId: author ? author.id : fallbackAuthor.authorId || '',
      author: author ? author.name : fallbackAuthor.author || '',
      authorEmail: author ? author.email : fallbackAuthor.authorEmail || '',
      authorBio: author ? author.bio : fallbackAuthor.authorBio || '',
      authorPicture: author ? author.picture : fallbackAuthor.authorPicture || '',
      authorTitle: fallbackAuthor.authorTitle || '',
      date: formatDate(dateValue),
      publishDate: dateValue,
      excerpt: getFieldValue('post-excerpt'),
      content: getFieldValue('post-content'),
      tags: tags,
      tagNames: tags.map(function (tagId) {
        const tag = tagsCache.find(function (item) { return item.id === tagId; });
        return tag ? tag.name : tagId;
      }),
      image: imageValue,
      imageAlt: getFieldValue('post-image-alt'),
      imageName: imageNameValue,
      imageType: imageUpload ? imageUpload.imageType : (existingPost && existingPost.imageType) || '',
      metaTitle: metaTitle,
      metaDescription: getFieldValue('post-meta-description'),
      videoUrl: typedVideoUrl,
      youtubeUrl: typedVideoUrl,
      url: pdfData ? pdfData : typedUrl,
      pdfData: pdfData,
      pdfName: pdfNameValue,
      pdfType: pdfUpload ? pdfUpload.pdfType : (existingPost && existingPost.pdfType) || '',
      status: selectedStatus,
      updatedAt: new Date().toISOString()
    };
  }

  function setCheckedTags(tagIds) {
    const tagSet = new Set(tagIds || []);
    document.querySelectorAll('input[name="post-tags"]').forEach(function (input) {
      const tag = tagsCache.find(function (item) { return item.id === input.value; });
      input.checked = tagSet.has(input.value) || (tag && (tagSet.has(tag.slug) || tagSet.has(tag.name)));
    });
  }

  function resetForm() {
    postForm.reset();
    setFieldValue('post-id', '');
    setFieldValue('post-status', 'draft');
    const dateField = getField('post-date');
    if (dateField) dateField.valueAsDate = new Date();
    setElementText(pdfName, '');
    setElementText(imageName, '');
    formTitle.textContent = 'Create Post';
    slugEdited = false;
    metaTitleEdited = false;
    setCheckedTags([]);
    syncHeadlineFields();
    updateAuthorPreview();
    activateTab('basic');
  }

  async function upsertPost(status) {
    const posts = await readPosts();
    const currentId = document.getElementById('post-id').value;
    const existingIndex = posts.findIndex(function (item) {
      return item.id === currentId;
    });
    const existingPost = existingIndex >= 0 ? posts[existingIndex] : null;
    let post;

    try {
      post = await getFormData(status, existingPost, posts);
    } catch (error) {
      setStatus(error.message);
      return;
    }

    const error = validationError(post);
    if (error) {
      setStatus(error.message);
      activateTabForField(error.field);
      const field = getField(error.field);
      if (field) field.focus();
      return;
    }

    if (existingIndex >= 0) {
      post.createdAt = posts[existingIndex].createdAt || post.updatedAt;
      posts[existingIndex] = post;
    } else {
      post.createdAt = post.updatedAt;
      posts.unshift(post);
    }

    forgetDeletedPost(post.id);

    const saveMode = await savePosts(posts);
    resetForm();
    await renderPosts(false);
    if (saveMode === 'api') {
      setStatus(post.status === 'published' ? 'Post published to the site.' : 'Draft saved.');
    }
  }

  function selectPostAuthor(post) {
    if (!post) return;
    let author = null;
    if (post.authorId) {
      author = authorsCache.find(function (item) { return item.id === post.authorId; });
    }
    if (!author && post.author) {
      author = authorsCache.find(function (item) {
        return item.name.toLowerCase() === String(post.author).toLowerCase();
      });
    }
    if (author) {
      setFieldValue('post-author', author.id);
    } else if (post.author && authorSelect) {
      const legacyId = `legacy-${slugify(post.author)}`;
      if (!authorSelect.querySelector(`option[value="${legacyId}"]`)) {
        const option = document.createElement('option');
        option.value = legacyId;
        option.textContent = `${post.author} (legacy)`;
        authorSelect.appendChild(option);
      }
      setFieldValue('post-author', legacyId);
    }
    updateAuthorPreview(post);
  }

  function editPost(id) {
    const post = postsCache.find(function (item) {
      return item.id === id;
    });
    if (!post) return;

    setFieldValue('post-id', post.id);
    setFieldValue('post-title', post.title);
    slugEdited = Boolean(post.slug);
    metaTitleEdited = Boolean(post.metaTitle);
    setFieldValue('post-slug', post.slug || slugify(post.title));
    setFieldValue('post-category', post.category || 'Articles');
    selectPostAuthor(post);
    setFieldValue('post-date', post.publishDate || dateInputValue(post.date));
    setFieldValue('post-status', post.status || 'draft');
    setFieldValue('post-excerpt', post.excerpt);
    setFieldValue('post-content', post.content || post.excerpt);
    setCheckedTags(postTagIds(post));
    setFieldValue('post-image-alt', post.imageAlt || post.title);
    setFieldValue('post-meta-title', post.metaTitle || (post.title || '').slice(0, 60));
    setFieldValue('post-meta-description', post.metaDescription || post.excerpt || '');
    setFieldValue('post-video', post.videoUrl || post.youtubeUrl);
    setFieldValue('post-url', post.pdfData ? '' : post.url);
    setElementText(pdfName, post.pdfName ? `Current PDF: ${post.pdfName}` : '');
    setElementText(imageName, post.imageName ? `Current image: ${post.imageName}` : '');
    formTitle.textContent = 'Edit Post';
    updateCounters();
    activateTab('basic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDeleteModal(id) {
    pendingDeleteId = id;
    deleteModal.hidden = false;
    confirmDeleteButton.focus();
  }

  function closeDeleteModal() {
    pendingDeleteId = null;
    deleteModal.hidden = true;
  }

  async function deletePost(id) {
    rememberDeletedPost(id);
    const posts = (await readPosts()).filter(function (post) {
      return post.id !== id;
    });
    await savePosts(posts);
    await renderPosts(false);
    closeDeleteModal();
    setStatus('Post deleted.');
  }

  async function togglePost(id) {
    const posts = await readPosts();
    const target = posts.find(function (post) {
      return post.id === id;
    });
    const nextStatus = target && target.status === 'published' ? 'draft' : 'published';

    if (target && nextStatus === 'published') {
      const candidate = Object.assign({}, target, {
        slug: target.slug || uniqueSlug(target.title, posts, target.id),
        imageAlt: target.imageAlt || target.title,
        metaTitle: target.metaTitle || (target.title || '').slice(0, 60),
        metaDescription: target.metaDescription || '',
        status: 'published'
      });
      const error = validationError(candidate);
      if (error) {
        setStatus(error.message);
        return;
      }
    }

    const updatedPosts = posts.map(function (post) {
      if (post.id !== id) return post;
      return Object.assign({}, post, {
        slug: post.slug || uniqueSlug(post.title, posts, post.id),
        imageAlt: post.imageAlt || post.title,
        metaTitle: post.metaTitle || (post.title || '').slice(0, 60),
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    });
    await savePosts(updatedPosts);
    await renderPosts(false);
    setStatus('Post status updated.');
  }

  function exportPosts() {
    const payload = JSON.stringify(postsCache, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'the-angle-admin-posts.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importPosts(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function () {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('Invalid data');
        await savePosts(data);
        await renderPosts(false);
        setStatus('Posts imported.');
      } catch (error) {
        setStatus('Import failed. Please choose a valid export file.');
      }
    };
    reader.readAsText(file);
  }

  async function renderPosts(refresh) {
    const posts = refresh === false ? postsCache : await readPosts();
    const visiblePosts = getVisiblePosts(posts);
    emptyState.hidden = posts.length > 0;

    if (!visiblePosts.length && posts.length) {
      postsList.innerHTML = '<div class="empty-state">No posts match that search.</div>';
      return;
    }

    postsList.innerHTML = visiblePosts.map(function (post) {
      const tagNames = (post.tagNames || postTagIds(post)).join(', ');
      return `
        <article class="admin-post-card">
          <div>
            <span class="status-pill ${post.status === 'published' ? 'published' : ''}">${escapeHtml(post.status)}</span>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.excerpt || post.content)}</p>
            ${post.pdfName ? `<div class="admin-meta">PDF: ${escapeHtml(post.pdfName)}</div>` : ''}
            <div class="admin-meta">${escapeHtml(post.category)} &middot; ${escapeHtml(post.author)} &middot; ${escapeHtml(post.date || 'No date')}</div>
            ${tagNames ? `<div class="admin-meta">Tags: ${escapeHtml(tagNames)}</div>` : ''}
          </div>
          <div class="admin-card-actions">
            <button type="button" data-action="edit" data-id="${escapeHtml(post.id)}"><i class="fas fa-pen"></i><span>Edit</span></button>
            <button type="button" data-action="toggle" data-id="${escapeHtml(post.id)}"><i class="fas fa-eye"></i><span>${post.status === 'published' ? 'Unpublish' : 'Publish'}</span></button>
            <button type="button" class="danger" data-action="delete" data-id="${escapeHtml(post.id)}"><i class="fas fa-trash"></i><span>Delete</span></button>
          </div>
        </article>
      `;
    }).join('');
  }

  function getPostTime(post) {
    const rawDate = post.updatedAt || post.publishDate || post.createdAt || post.date || '';
    const time = Date.parse(rawDate);
    return Number.isNaN(time) ? 0 : time;
  }

  function getPostDateKey(post) {
    const rawDate = post.publishDate || post.date || post.createdAt || '';
    const time = Date.parse(rawDate);
    if (Number.isNaN(time)) return String(rawDate).trim().toLowerCase();
    return new Date(time).toISOString().slice(0, 10);
  }

  function compareText(a, b) {
    return String(a || '').localeCompare(String(b || ''), undefined, {
      sensitivity: 'base'
    });
  }

  function getVisiblePosts(posts) {
    const searchMode = postsSearchType ? postsSearchType.value : 'author';
    const authorQuery = postsSearchInput ? postsSearchInput.value.trim().toLowerCase() : '';
    const dateQuery = postsSearchDate ? postsSearchDate.value : '';
    const visiblePosts = posts.filter(function (post) {
      if (searchMode === 'date') {
        return !dateQuery || getPostDateKey(post) === dateQuery;
      }

      if (!authorQuery) return true;
      return String(post.author || '').toLowerCase().includes(authorQuery);
    });

    visiblePosts.sort(function (a, b) {
      return getPostTime(b) - getPostTime(a);
    });

    return visiblePosts;
  }

  function updatePostsSearchMode() {
    const isDateSearch = postsSearchType && postsSearchType.value === 'date';
    if (postsSearchTextField) postsSearchTextField.hidden = isDateSearch;
    if (postsSearchDateField) postsSearchDateField.hidden = !isDateSearch;
    renderPosts(false);
  }

  function renderAuthorOptions() {
    if (!authorSelect) return;
    const currentValue = authorSelect.value;
    authorSelect.innerHTML = '<option value="">Choose an author</option>' + authorsCache.map(function (author) {
      return `<option value="${escapeHtml(author.id)}">${escapeHtml(author.name)}</option>`;
    }).join('');
    if (currentValue && authorSelect.querySelector(`option[value="${currentValue}"]`)) {
      authorSelect.value = currentValue;
    }
    updateAuthorPreview();
  }

  function resetAuthorForm() {
    authorForm.reset();
    setFieldValue('author-id', '');
    setElementText(authorPictureName, '');
  }

  async function upsertAuthor() {
    const name = getFieldValue('author-name');
    const email = getFieldValue('author-email');
    const bio = getFieldValue('author-bio');
    const id = getFieldValue('author-id') || slugify(name) || String(Date.now());
    const existing = authorsCache.find(function (author) {
      return author.id === id;
    });
    let pictureUpload;

    if (!name || !email || !bio) {
      setStatus('Please complete the author name, email, and bio.');
      return;
    }

    try {
      pictureUpload = await readImageUpload(authorPictureInput, 'author picture');
    } catch (error) {
      setStatus(error.message);
      return;
    }

    const author = {
      id: id,
      name: name,
      email: email,
      bio: bio,
      picture: pictureUpload ? pictureUpload.imageData : (existing && existing.picture) || AUTHOR_PLACEHOLDER,
      pictureName: pictureUpload ? pictureUpload.imageName : (existing && existing.pictureName) || '',
      pictureType: pictureUpload ? pictureUpload.imageType : (existing && existing.pictureType) || '',
      createdAt: (existing && existing.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedAuthors = authorsCache.filter(function (item) {
      return item.id !== id;
    });
    updatedAuthors.push(author);
    updatedAuthors.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    await saveAuthors(updatedAuthors);
    renderAuthorOptions();
    renderAuthors();
    resetAuthorForm();
    setStatus('Author saved.');
  }

  function editAuthor(id) {
    const author = authorsCache.find(function (item) {
      return item.id === id;
    });
    if (!author) return;
    setFieldValue('author-id', author.id);
    setFieldValue('author-name', author.name);
    setFieldValue('author-email', author.email);
    setFieldValue('author-bio', author.bio);
    setElementText(authorPictureName, author.pictureName ? `Current picture: ${author.pictureName}` : '');
  }

  async function deleteAuthor(id) {
    const updatedAuthors = authorsCache.filter(function (author) {
      return author.id !== id;
    });
    await saveAuthors(updatedAuthors);
    renderAuthorOptions();
    renderAuthors();
    setStatus('Author removed. Existing articles keep their attached author details.');
  }

  function renderAuthors() {
    if (!authorsList) return;
    authorsList.innerHTML = authorsCache.map(function (author) {
      return `
        <article class="admin-list-card">
          <header>
            <h3>${escapeHtml(author.name)}</h3>
            <div class="small-actions">
              <button type="button" data-author-action="edit" data-id="${escapeHtml(author.id)}">Edit</button>
              <button type="button" class="danger" data-author-action="delete" data-id="${escapeHtml(author.id)}">Remove</button>
            </div>
          </header>
          <p>${escapeHtml(author.email)}</p>
          <p>${escapeHtml(author.bio)}</p>
        </article>
      `;
    }).join('') || '<div class="empty-state">No saved authors yet.</div>';
  }

  function renderTagChecklist() {
    if (!postTagsList) return;
    postTagsList.innerHTML = tagsCache.map(function (tag) {
      return `
        <label>
          <input type="checkbox" name="post-tags" value="${escapeHtml(tag.id)}">
          <span>${escapeHtml(tag.name)}</span>
        </label>
      `;
    }).join('') || '<span class="field-hint">No tags yet. Create one in Tag Management.</span>';
  }

  function resetTagForm() {
    tagForm.reset();
    setFieldValue('tag-id', '');
  }

  async function upsertTag() {
    const name = getFieldValue('tag-name');
    const id = getFieldValue('tag-id') || slugify(name) || String(Date.now());
    const existing = tagsCache.find(function (tag) {
      return tag.id === id;
    });

    if (!name) {
      setStatus('Please add a tag name.');
      return;
    }

    const tag = {
      id: id,
      name: name,
      slug: slugify(name),
      createdAt: (existing && existing.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedTags = tagsCache.filter(function (item) {
      return item.id !== id;
    });
    updatedTags.push(tag);
    updatedTags.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    await saveTags(updatedTags);
    renderTags();
    renderTagChecklist();
    resetTagForm();
    setStatus('Tag saved.');
  }

  function editTag(id) {
    const tag = tagsCache.find(function (item) {
      return item.id === id;
    });
    if (!tag) return;
    setFieldValue('tag-id', tag.id);
    setFieldValue('tag-name', tag.name);
  }

  async function deleteTag(id) {
    const updatedTags = tagsCache.filter(function (tag) {
      return tag.id !== id;
    });
    const updatedPosts = postsCache.map(function (post) {
      return Object.assign({}, post, {
        tags: postTagIds(post).filter(function (tagId) {
          return tagId !== id;
        }),
        tagNames: (post.tagNames || []).filter(function (name) {
          const tag = tagsCache.find(function (item) { return item.id === id; });
          return !tag || name !== tag.name;
        }),
        updatedAt: new Date().toISOString()
      });
    });

    await saveTags(updatedTags);
    await savePosts(updatedPosts);
    renderTags();
    renderTagChecklist();
    await renderPosts(false);
    setStatus('Tag removed from the tag list and articles.');
  }

  function renderTags() {
    if (!tagsList) return;
    tagsList.innerHTML = tagsCache.map(function (tag) {
      return `
        <article class="admin-list-card">
          <header>
            <h3>${escapeHtml(tag.name)}</h3>
            <div class="small-actions">
              <button type="button" data-tag-action="edit" data-id="${escapeHtml(tag.id)}">Edit</button>
              <button type="button" class="danger" data-tag-action="delete" data-id="${escapeHtml(tag.id)}">Remove</button>
            </div>
          </header>
          <p>${escapeHtml(tag.slug)}</p>
        </article>
      `;
    }).join('') || '<div class="empty-state">No saved tags yet.</div>';
  }

  function renderHomepageForm() {
    const homepage = Object.assign({}, homepageDefaults, homepageCache || {});
    setFieldValue('home-hero-category', homepage.heroCategory);
    setFieldValue('home-hero-kicker', homepage.heroKicker);
    setFieldValue('home-hero-title', homepage.heroTitle);
    setFieldValue('home-hero-author', homepage.heroAuthor);
    setFieldValue('home-hero-date', homepage.heroDate);
    setFieldValue('home-hero-excerpt', homepage.heroExcerpt);
    setFieldValue('home-hero-url', homepage.heroUrl);
    setFieldValue('home-featured-title', homepage.featuredTitle);
    setFieldValue('home-podcast-title', homepage.podcastTitle);
    setFieldValue('home-podcast-subtitle', homepage.podcastSubtitle);
  }

  async function updateHomepage() {
    const homepage = {
      heroCategory: getFieldValue('home-hero-category'),
      heroKicker: getFieldValue('home-hero-kicker'),
      heroTitle: getFieldValue('home-hero-title'),
      heroAuthor: getFieldValue('home-hero-author'),
      heroDate: getFieldValue('home-hero-date'),
      heroExcerpt: getFieldValue('home-hero-excerpt'),
      heroUrl: getFieldValue('home-hero-url'),
      featuredTitle: getFieldValue('home-featured-title'),
      podcastTitle: getFieldValue('home-podcast-title'),
      podcastSubtitle: getFieldValue('home-podcast-subtitle'),
      updatedAt: new Date().toISOString()
    };

    if (!homepage.heroTitle || !homepage.heroExcerpt || !homepage.heroUrl) {
      setStatus('Please complete the homepage hero headline, excerpt, and link.');
      return;
    }

    await saveHomepage(homepage);
    setStatus('Homepage headlines saved.');
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const pin = document.getElementById('admin-pin').value.trim();
    if (pin !== ADMIN_PIN) {
      setStatus('Incorrect admin PIN.');
      return;
    }
    sessionStorage.setItem(SESSION_KEY, 'true');
    showDashboard();
  });

  postForm.addEventListener('submit', function (event) {
    event.preventDefault();
    upsertPost(getFieldValue('post-status') || 'published');
  });

  authorForm.addEventListener('submit', function (event) {
    event.preventDefault();
    upsertAuthor();
  });

  tagForm.addEventListener('submit', function (event) {
    event.preventDefault();
    upsertTag();
  });

  homepageForm.addEventListener('submit', function (event) {
    event.preventDefault();
    updateHomepage();
  });

  document.getElementById('save-draft').addEventListener('click', function () {
    setFieldValue('post-status', 'draft');
    upsertPost('draft');
  });

  document.getElementById('reset-form').addEventListener('click', resetForm);
  document.getElementById('reset-author').addEventListener('click', resetAuthorForm);
  document.getElementById('reset-tag').addEventListener('click', resetTagForm);
  document.getElementById('export-posts').addEventListener('click', exportPosts);
  document.getElementById('import-posts').addEventListener('change', function (event) {
    importPosts(event.target.files[0]);
  });

  if (postsSearchType) {
    postsSearchType.addEventListener('change', updatePostsSearchMode);
  }

  if (postsSearchInput) {
    postsSearchInput.addEventListener('input', function () {
      renderPosts(false);
    });
  }

  if (postsSearchDate) {
    postsSearchDate.addEventListener('change', function () {
      renderPosts(false);
    });
  }

  if (clearPostsSearch) {
    clearPostsSearch.addEventListener('click', function () {
      if (postsSearchInput) postsSearchInput.value = '';
      if (postsSearchDate) postsSearchDate.value = '';
      renderPosts(false);
    });
  }

  if (pdfInput) {
    pdfInput.addEventListener('change', function () {
      const file = pdfInput.files && pdfInput.files[0];
      setElementText(pdfName, file ? `Selected PDF: ${file.name}` : '');
    });
  }

  if (imageInput) {
    imageInput.addEventListener('change', function () {
      const file = imageInput.files && imageInput.files[0];
      setElementText(imageName, file ? `Selected image: ${file.name}` : '');
    });
  }

  if (authorPictureInput) {
    authorPictureInput.addEventListener('change', function () {
      const file = authorPictureInput.files && authorPictureInput.files[0];
      setElementText(authorPictureName, file ? `Selected picture: ${file.name}` : '');
    });
  }

  if (authorSelect) {
    authorSelect.addEventListener('change', function () {
      updateAuthorPreview();
    });
  }

  tabButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      activateTab(button.dataset.tabTarget);
    });
  });

  const titleField = getField('post-title');
  if (titleField) {
    titleField.addEventListener('input', syncHeadlineFields);
  }

  const slugField = getField('post-slug');
  if (slugField) {
    slugField.addEventListener('input', function () {
      slugEdited = true;
      setFieldValue('post-slug', slugify(getFieldValue('post-slug')));
    });
  }

  const metaTitleField = getField('post-meta-title');
  if (metaTitleField) {
    metaTitleField.addEventListener('input', function () {
      metaTitleEdited = true;
      updateCounter('post-meta-title');
    });
  }

  ['post-image-alt', 'post-meta-description'].forEach(function (id) {
    const field = getField(id);
    if (field) {
      field.addEventListener('input', function () {
        updateCounter(id);
      });
    }
  });

  document.getElementById('logout').addEventListener('click', function () {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });

  cancelDeleteButton.addEventListener('click', closeDeleteModal);
  confirmDeleteButton.addEventListener('click', function () {
    if (pendingDeleteId) deletePost(pendingDeleteId);
  });
  deleteModal.addEventListener('click', function (event) {
    if (event.target === deleteModal) closeDeleteModal();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !deleteModal.hidden) closeDeleteModal();
  });

  postsList.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === 'edit') editPost(id);
    if (action === 'toggle') togglePost(id);
    if (action === 'delete') openDeleteModal(id);
  });

  authorsList.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-author-action]');
    if (!button) return;
    if (button.dataset.authorAction === 'edit') editAuthor(button.dataset.id);
    if (button.dataset.authorAction === 'delete') deleteAuthor(button.dataset.id);
  });

  tagsList.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-tag-action]');
    if (!button) return;
    if (button.dataset.tagAction === 'edit') editTag(button.dataset.id);
    if (button.dataset.tagAction === 'delete') deleteTag(button.dataset.id);
  });

  resetForm();
  resetAuthorForm();
  resetTagForm();
  showStorageWarning();
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    showDashboard();
  } else {
    showLogin();
  }
})();
