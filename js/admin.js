(function () {
  const STORAGE_KEY = 'angleAdminPosts';
  const SESSION_KEY = 'angleAdminSession';
  const POSTS_API = '/api/posts';
  const ADMIN_PIN = 'angle-admin';

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const postForm = document.getElementById('post-form');
  const postsList = document.getElementById('posts-list');
  const statusMessages = document.querySelectorAll('.status-message');
  const formTitle = document.getElementById('form-title');
  const emptyState = document.getElementById('empty-state');
  const dashboardTools = document.getElementById('dashboard-tools');
  const adminHero = document.querySelector('.admin-hero');
  const deleteModal = document.getElementById('delete-modal');
  const cancelDeleteButton = document.getElementById('cancel-delete');
  const confirmDeleteButton = document.getElementById('confirm-delete');
  const pdfInput = document.getElementById('post-pdf');
  const pdfName = document.getElementById('post-pdf-name');
  let pendingDeleteId = null;
  let postsCache = [];

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
      if (!posts.length && localPosts.length) {
        await savePosts(localPosts);
        return localPosts;
      }
      postsCache = posts;
      saveLocalPosts(posts);
      return posts;
    } catch (error) {
      postsCache = readLocalPosts();
      return postsCache;
    }
  }

  async function savePosts(posts) {
    postsCache = posts;
    saveLocalPosts(posts);

    try {
      const response = await fetch(POSTS_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posts)
      });
      if (!response.ok) throw new Error('Posts API unavailable.');
    } catch (error) {
      setStatus('Saved in this browser. Start the local server to keep posts available after refresh and across pages.');
    }
  }

  function setStatus(message) {
    statusMessages.forEach(function (statusMessage) {
      statusMessage.textContent = message;
    });
    window.setTimeout(function () {
      statusMessages.forEach(function (statusMessage) {
        statusMessage.textContent = '';
      });
    }, 4000);
  }

  async function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    dashboardTools.hidden = false;
    adminHero.classList.remove('login-mode');
    await renderPosts();
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

  function readPdfUpload() {
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

  async function getFormData(status, existingPost) {
    const pdfUpload = await readPdfUpload();
    const pdfData = pdfUpload ? pdfUpload.pdfData : (existingPost && existingPost.pdfData) || '';
    const pdfNameValue = pdfUpload ? pdfUpload.pdfName : (existingPost && existingPost.pdfName) || '';
    const typedUrl = document.getElementById('post-url').value.trim();
    const id = document.getElementById('post-id').value || String(Date.now());

    return {
      id: id,
      title: document.getElementById('post-title').value.trim(),
      category: document.getElementById('post-category').value,
      author: document.getElementById('post-author').value.trim(),
      date: formatDate(document.getElementById('post-date').value),
      excerpt: document.getElementById('post-excerpt').value.trim(),
      content: document.getElementById('post-content').value.trim(),
      image: document.getElementById('post-image').value.trim(),
      url: pdfData ? pdfData : typedUrl,
      pdfData: pdfData,
      pdfName: pdfNameValue,
      pdfType: pdfUpload ? pdfUpload.pdfType : (existingPost && existingPost.pdfType) || '',
      status: status,
      updatedAt: new Date().toISOString()
    };
  }

  function resetForm() {
    postForm.reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-date').valueAsDate = new Date();
    pdfName.textContent = '';
    formTitle.textContent = 'Create Post';
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
      post = await getFormData(status, existingPost);
    } catch (error) {
      setStatus(error.message);
      return;
    }

    if (!post.title || !post.author || !post.excerpt || !post.content) {
      setStatus('Please add a title, author, excerpt, and article content.');
      return;
    }

    if (existingIndex >= 0) {
      post.createdAt = posts[existingIndex].createdAt || post.updatedAt;
      posts[existingIndex] = post;
    } else {
      post.createdAt = post.updatedAt;
      posts.unshift(post);
    }

    await savePosts(posts);
    resetForm();
    await renderPosts(false);
    setStatus(status === 'published' ? 'Post published to the site.' : 'Draft saved.');
  }

  function editPost(id) {
    const post = postsCache.find(function (item) {
      return item.id === id;
    });
    if (!post) return;

    document.getElementById('post-id').value = post.id;
    document.getElementById('post-title').value = post.title || '';
    document.getElementById('post-category').value = post.category || 'Articles';
    document.getElementById('post-author').value = post.author || '';
    document.getElementById('post-date').value = dateInputValue(post.date);
    document.getElementById('post-excerpt').value = post.excerpt || '';
    document.getElementById('post-content').value = post.content || post.excerpt || '';
    document.getElementById('post-image').value = post.image || '';
    document.getElementById('post-url').value = post.pdfData ? '' : (post.url || '');
    pdfName.textContent = post.pdfName ? `Current PDF: ${post.pdfName}` : '';
    formTitle.textContent = 'Edit Post';
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
    const posts = (await readPosts()).filter(function (post) {
      return post.id !== id;
    });
    await savePosts(posts);
    await renderPosts(false);
    closeDeleteModal();
    setStatus('Post deleted.');
  }

  async function togglePost(id) {
    const posts = (await readPosts()).map(function (post) {
      if (post.id !== id) return post;
      return Object.assign({}, post, {
        status: post.status === 'published' ? 'draft' : 'published',
        updatedAt: new Date().toISOString()
      });
    });
    await savePosts(posts);
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
    emptyState.hidden = posts.length > 0;
    postsList.innerHTML = posts.map(function (post) {
      return `
        <article class="admin-post-card">
          <div>
            <span class="status-pill ${post.status === 'published' ? 'published' : ''}">${escapeHtml(post.status)}</span>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.excerpt || post.content)}</p>
            ${post.pdfName ? `<div class="admin-meta">PDF: ${escapeHtml(post.pdfName)}</div>` : ''}
            <div class="admin-meta">${escapeHtml(post.category)} &middot; ${escapeHtml(post.author)} &middot; ${escapeHtml(post.date || 'No date')}</div>
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
    upsertPost('published');
  });

  document.getElementById('save-draft').addEventListener('click', function () {
    upsertPost('draft');
  });

  document.getElementById('reset-form').addEventListener('click', resetForm);
  document.getElementById('export-posts').addEventListener('click', exportPosts);
  document.getElementById('import-posts').addEventListener('change', function (event) {
    importPosts(event.target.files[0]);
  });

  pdfInput.addEventListener('change', function () {
    const file = pdfInput.files && pdfInput.files[0];
    pdfName.textContent = file ? `Selected PDF: ${file.name}` : '';
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

  resetForm();
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    showDashboard();
  } else {
    showLogin();
  }
})();
