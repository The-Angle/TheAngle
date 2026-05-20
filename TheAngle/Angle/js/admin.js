(function () {
  const STORAGE_KEY = 'angleAdminPosts';
  const SESSION_KEY = 'angleAdminSession';
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

  function savePosts(posts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }

  function setStatus(message) {
    statusMessages.forEach(function (statusMessage) {
      statusMessage.textContent = message;
    });
    window.setTimeout(function () {
      statusMessages.forEach(function (statusMessage) {
        statusMessage.textContent = '';
      });
    }, 3000);
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    dashboardTools.hidden = false;
    renderPosts();
  }

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
    dashboardTools.hidden = true;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getFormData(status) {
    return {
      id: document.getElementById('post-id').value || String(Date.now()),
      title: document.getElementById('post-title').value.trim(),
      category: document.getElementById('post-category').value,
      author: document.getElementById('post-author').value.trim(),
      date: formatDate(document.getElementById('post-date').value),
      excerpt: document.getElementById('post-excerpt').value.trim(),
      image: document.getElementById('post-image').value.trim(),
      url: document.getElementById('post-url').value.trim(),
      status: status,
      updatedAt: new Date().toISOString()
    };
  }

  function resetForm() {
    postForm.reset();
    document.getElementById('post-id').value = '';
    document.getElementById('post-date').valueAsDate = new Date();
    formTitle.textContent = 'Create Post';
  }

  function upsertPost(status) {
    const post = getFormData(status);
    if (!post.title || !post.author || !post.excerpt) {
      setStatus('Please add a title, author, and excerpt.');
      return;
    }

    const posts = readPosts();
    const existingIndex = posts.findIndex(function (item) {
      return item.id === post.id;
    });

    if (existingIndex >= 0) {
      post.createdAt = posts[existingIndex].createdAt || post.updatedAt;
      posts[existingIndex] = post;
    } else {
      post.createdAt = post.updatedAt;
      posts.unshift(post);
    }

    savePosts(posts);
    resetForm();
    renderPosts();
    setStatus(status === 'published' ? 'Post published to the site.' : 'Draft saved.');
  }

  function editPost(id) {
    const post = readPosts().find(function (item) {
      return item.id === id;
    });
    if (!post) return;

    document.getElementById('post-id').value = post.id;
    document.getElementById('post-title').value = post.title || '';
    document.getElementById('post-category').value = post.category || 'Articles';
    document.getElementById('post-author').value = post.author || '';
    document.getElementById('post-date').value = post.date ? new Date(post.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    document.getElementById('post-excerpt').value = post.excerpt || '';
    document.getElementById('post-image').value = post.image || '';
    document.getElementById('post-url').value = post.url || '';
    formTitle.textContent = 'Edit Post';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deletePost(id) {
    const posts = readPosts().filter(function (post) {
      return post.id !== id;
    });
    savePosts(posts);
    renderPosts();
    setStatus('Post deleted.');
  }

  function togglePost(id) {
    const posts = readPosts().map(function (post) {
      if (post.id !== id) return post;
      return Object.assign({}, post, {
        status: post.status === 'published' ? 'draft' : 'published',
        updatedAt: new Date().toISOString()
      });
    });
    savePosts(posts);
    renderPosts();
    setStatus('Post status updated.');
  }

  function exportPosts() {
    const payload = JSON.stringify(readPosts(), null, 2);
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
    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('Invalid data');
        savePosts(data);
        renderPosts();
        setStatus('Posts imported.');
      } catch (error) {
        setStatus('Import failed. Please choose a valid export file.');
      }
    };
    reader.readAsText(file);
  }

  function renderPosts() {
    const posts = readPosts();
    emptyState.hidden = posts.length > 0;
    postsList.innerHTML = posts.map(function (post) {
      return `
        <article class="admin-post-card">
          <div>
            <span class="status-pill ${post.status === 'published' ? 'published' : ''}">${escapeHtml(post.status)}</span>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.excerpt)}</p>
            <div class="admin-meta">${escapeHtml(post.category)} · ${escapeHtml(post.author)} · ${escapeHtml(post.date || 'No date')}</div>
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

  document.getElementById('logout').addEventListener('click', function () {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });

  postsList.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === 'edit') editPost(id);
    if (action === 'toggle') togglePost(id);
    if (action === 'delete') deletePost(id);
  });

  resetForm();
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    showDashboard();
  } else {
    showLogin();
  }
})();
