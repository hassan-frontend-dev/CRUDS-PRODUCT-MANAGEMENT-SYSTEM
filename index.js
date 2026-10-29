'use strict';

(() => {
  const $ = (selector) => document.querySelector(selector);
  const els = {
    form: $('#productForm'), title: $('#title'), price: $('#price'), taxes: $('#taxes'), ads: $('#ads'), discount: $('#discount'), count: $('#count'), category: $('#category'), customCategory: $('#customCategory'), customCategoryField: $('#customCategoryField'), submit: $('#submit'), cancelEdit: $('#cancelEdit'), formHeading: $('#formHeading'), formFeedback: $('#formFeedback'), total: $('#total'), totalBreakdown: $('#totalBreakdown'), search: $('#search'), clearSearch: $('#clearSearch'), searchTitle: $('#searchTitle'), searchCategory: $('#searchcategory'), categoryFilter: $('#categoryFilter'), tbody: $('#tbody'), emptyState: $('#emptyState'), statProducts: $('#statProducts'), statValue: $('#statValue'), statCategories: $('#statCategories'), sideCount: $('#sideCount'), inventoryCount: $('#inventoryCount'), tableSummary: $('#tableSummary'), deleteAllButton: $('#deleteAllButton'), toast: $('#toast'), toastMessage: $('#toastMessage'), modal: $('#confirmModal'), modalMessage: $('#modalMessage'), modalCancel: $('#modalCancel'), modalConfirm: $('#modalConfirm'), themeToggle: $('#themeToggle'), sidebar: $('#sidebar'), menuToggle: $('#menuToggle')
  };
  const STORAGE_KEY = 'crus_products_v2';
  let products = loadProducts();
  let editingId = null;
  let searchMode = 'title';
  let toastTimer;
  let modalAction = null;

  function loadProducts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(p => p && typeof p === 'object' && p.id != null) : [];
    } catch (error) {
      console.warn('Unable to read saved products:', error);
      return [];
    }
  }
  function saveProducts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      return true;
    } catch (error) {
      console.error('Unable to save products:', error);
      showToast('Could not save data. Browser storage may be full.', 'error');
      return false;
    }
  }
  function numeric(input) {
    const value = Number(input.value);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }
  function money(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
  }
  function unitTotal(item) {
    return Math.max(0, Number(item.price) + Number(item.taxes) + Number(item.ads) - Number(item.discount));
  }
  function getFormValues() {
    const category = els.category.value === 'Other' ? els.customCategory.value.trim() : els.category.value;
    return {
      title: els.title.value.trim(), price: numeric(els.price), taxes: numeric(els.taxes), ads: numeric(els.ads), discount: numeric(els.discount),
      count: Math.floor(Number(els.count.value)), category
    };
  }
  function updateCalculator() {
    const price = numeric(els.price), taxes = numeric(els.taxes), ads = numeric(els.ads), discount = numeric(els.discount);
    const total = Math.max(0, price + taxes + ads - discount);
    els.total.textContent = money(total);
    els.totalBreakdown.textContent = `${money(price)} + ${money(taxes)} + ${money(ads)} − ${money(discount)}`;
  }
  function setCustomCategoryVisibility() {
    const show = els.category.value === 'Other';
    els.customCategoryField.hidden = !show;
    els.customCategory.required = show;
    if (!show) els.customCategory.value = '';
  }
  function safeText(value) { return String(value ?? ''); }
  function escapeHTML(value) {
    return safeText(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function iconForCategory(category) {
    const key = String(category || '').toLowerCase();
    if (key.includes('elect')) return 'fa-plug';
    if (key.includes('access')) return 'fa-headphones';
    if (key.includes('home')) return 'fa-house';
    if (key.includes('fashion')) return 'fa-shirt';
    if (key.includes('beauty')) return 'fa-wand-magic-sparkles';
    if (key.includes('sport')) return 'fa-dumbbell';
    return 'fa-box';
  }
  function currentFilteredProducts() {
    const query = els.search.value.trim().toLowerCase();
    const chosenCategory = els.categoryFilter.value;
    return products.filter(product => {
      const target = searchMode === 'category' ? product.category : product.title;
      const matchesQuery = !query || safeText(target).toLowerCase().includes(query);
      const matchesCategory = chosenCategory === 'all' || product.category === chosenCategory;
      return matchesQuery && matchesCategory;
    });
  }
  function render() {
    const visible = currentFilteredProducts();
    els.tbody.innerHTML = visible.map(product => {
      const total = unitTotal(product);
      const title = escapeHTML(product.title);
      const category = escapeHTML(product.category);
      return `<tr data-id="${escapeHTML(product.id)}">
        <td class="id-cell">#${escapeHTML(String(product.id).slice(-5))}</td>
        <td><div class="product-cell"><span class="product-thumb"><i class="fa-solid ${iconForCategory(product.category)}"></i></span><div><div class="product-name" title="${title}">${title}</div><div class="product-subtitle">Product item</div></div></div></td>
        <td class="money">${money(product.price)}</td><td class="money">${money(product.taxes)}</td><td class="money">${money(product.ads)}</td><td class="money">${money(product.discount)}</td>
        <td class="money final-price">${money(total)}</td><td><span class="qty-pill">${Number(product.count) || 0}</span></td><td><span class="category-pill">${category}</span></td>
        <td><div class="row-actions"><button class="action-button edit" type="button" data-action="edit" data-id="${escapeHTML(product.id)}" aria-label="Edit ${title}" title="Edit product"><i class="fa-solid fa-pen"></i></button><button class="action-button delete" type="button" data-action="delete" data-id="${escapeHTML(product.id)}" aria-label="Delete ${title}" title="Delete product"><i class="fa-regular fa-trash-can"></i></button></div></td>
      </tr>`;
    }).join('');

    const noProducts = visible.length === 0;
    els.emptyState.classList.toggle('visible', noProducts);
    els.emptyState.querySelector('h3').textContent = products.length === 0 ? 'No products yet' : 'No matching products';
    els.emptyState.querySelector('p').textContent = products.length === 0 ? 'Add your first product using the form above.' : 'Try another search term or category filter.';
    $('#emptyAdd').hidden = products.length > 0;
    els.statProducts.textContent = products.reduce((sum, product) => sum + Math.max(0, Number(product.count) || 0), 0).toLocaleString('en-US');
    const inventoryValue = products.reduce((sum, product) => sum + unitTotal(product) * Math.max(0, Number(product.count) || 0), 0);
    els.statValue.textContent = money(inventoryValue);
    els.statCategories.textContent = new Set(products.map(p => safeText(p.category).trim()).filter(Boolean)).size;
    els.sideCount.textContent = products.length;
    els.inventoryCount.textContent = `${products.length} ${products.length === 1 ? 'item' : 'items'}`;
    els.tableSummary.textContent = `Showing ${visible.length} of ${products.length} ${products.length === 1 ? 'product' : 'products'}`;
    els.deleteAllButton.hidden = products.length === 0;
    els.clearSearch.hidden = !els.search.value;
    renderCategoryFilter();
  }
  function renderCategoryFilter() {
    const selected = els.categoryFilter.value || 'all';
    const categories = [...new Set(products.map(p => safeText(p.category).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    els.categoryFilter.innerHTML = '<option value="all">All categories</option>' + categories.map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join('');
    els.categoryFilter.value = categories.includes(selected) ? selected : 'all';
  }
  function resetForm() {
    editingId = null;
    els.form.reset();
    els.taxes.value = '0'; els.ads.value = '0'; els.discount.value = '0'; els.count.value = '1';
    els.formHeading.textContent = 'Create a product';
    els.submit.innerHTML = '<i class="fa-solid fa-plus"></i><span>Create product</span>';
    els.cancelEdit.hidden = true;
    els.formFeedback.textContent = '';
    setCustomCategoryVisibility(); updateCalculator();
  }
  function beginEdit(id) {
    const product = products.find(item => String(item.id) === String(id));
    if (!product) return;
    editingId = product.id;
    els.title.value = product.title;
    els.price.value = product.price;
    els.taxes.value = product.taxes;
    els.ads.value = product.ads;
    els.discount.value = product.discount;
    els.count.value = product.count;
    const builtIn = [...els.category.options].some(option => option.value === product.category && option.value !== 'Other');
    if (builtIn) { els.category.value = product.category; els.customCategory.value = ''; }
    else { els.category.value = 'Other'; els.customCategory.value = product.category; }
    setCustomCategoryVisibility();
    els.formHeading.textContent = 'Update product';
    els.submit.innerHTML = '<i class="fa-solid fa-check"></i><span>Save changes</span>';
    els.cancelEdit.hidden = false;
    els.formFeedback.textContent = 'Editing selected product';
    updateCalculator();
    $('#productFormSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    els.title.focus({ preventScroll: true });
  }
  function showToast(message, type = 'success') {
    clearTimeout(toastTimer);
    els.toastMessage.textContent = message;
    const icon = els.toast.querySelector('.toast-icon i');
    icon.className = type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-check';
    els.toast.querySelector('.toast-icon').style.background = type === 'error' ? '#4a202d' : '#174436';
    els.toast.querySelector('.toast-icon').style.color = type === 'error' ? '#ff8297' : '#62e0ae';
    els.toast.classList.add('show');
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3200);
  }
  function openConfirm(message, action) {
    els.modalMessage.textContent = message;
    modalAction = action;
    els.modal.hidden = false;
    els.modalConfirm.focus();
  }
  function closeConfirm() { els.modal.hidden = true; modalAction = null; }

  [els.price, els.taxes, els.ads, els.discount].forEach(input => input.addEventListener('input', updateCalculator));
  els.category.addEventListener('change', setCustomCategoryVisibility);
  els.form.addEventListener('submit', event => {
    event.preventDefault();
    if (!els.form.reportValidity()) return;
    const item = getFormValues();
    if (!item.title || !item.category || !Number.isInteger(item.count) || item.count < 1) {
      showToast('Please complete the required fields correctly.', 'error'); return;
    }
    if (item.discount > item.price + item.taxes + item.ads) {
      showToast('Discount is greater than the price plus taxes and fees.', 'error'); return;
    }
    if (editingId !== null) {
      products = products.map(product => String(product.id) === String(editingId) ? { ...product, ...item } : product);
      if (!saveProducts()) return;
      render(); resetForm(); showToast('Product updated successfully.');
    } else {
      const id = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      products.unshift({ id, ...item, createdAt: new Date().toISOString() });
      if (!saveProducts()) { products.shift(); return; }
      render(); resetForm(); showToast('Product created successfully.');
    }
  });
  els.cancelEdit.addEventListener('click', () => { resetForm(); showToast('Edit cancelled.'); });
  els.tbody.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'edit') beginEdit(id);
    if (action === 'delete') {
      const product = products.find(item => String(item.id) === String(id));
      if (!product) return;
      openConfirm(`Delete “${product.title}”? This product will be removed from your inventory.`, () => {
        products = products.filter(item => String(item.id) !== String(id));
        saveProducts(); if (String(editingId) === String(id)) resetForm();
        render(); showToast('Product deleted.');
      });
    }
  });
  els.search.addEventListener('input', render);
  els.clearSearch.addEventListener('click', () => { els.search.value = ''; render(); els.search.focus(); });
  els.categoryFilter.addEventListener('change', render);
  function setSearchMode(mode) {
    searchMode = mode;
    els.searchTitle.classList.toggle('active', mode === 'title');
    els.searchCategory.classList.toggle('active', mode === 'category');
    els.search.placeholder = mode === 'title' ? 'Search product titles...' : 'Search product categories...';
    els.search.setAttribute('aria-label', mode === 'title' ? 'Search product titles' : 'Search product categories');
    render();
  }
  els.searchTitle.addEventListener('click', () => setSearchMode('title'));
  els.searchCategory.addEventListener('click', () => setSearchMode('category'));
  els.deleteAllButton.addEventListener('click', () => openConfirm(`Delete all ${products.length} products? This action cannot be undone.`, () => {
    products = []; saveProducts(); resetForm(); render(); showToast('All products have been deleted.');
  }));
  els.modalCancel.addEventListener('click', closeConfirm);
  els.modalConfirm.addEventListener('click', () => { const action = modalAction; closeConfirm(); if (typeof action === 'function') action(); });
  els.modal.addEventListener('click', event => { if (event.target === els.modal) closeConfirm(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeConfirm(); els.sidebar.classList.remove('open'); } });
  $('#closeToast').addEventListener('click', () => { clearTimeout(toastTimer); els.toast.classList.remove('show'); });
  $('#jumpToForm').addEventListener('click', () => { $('#productFormSection').scrollIntoView({ behavior: 'smooth', block: 'start' }); els.title.focus({ preventScroll: true }); });
  $('#emptyAdd').addEventListener('click', () => $('#jumpToForm').click());
  els.menuToggle.addEventListener('click', () => els.sidebar.classList.toggle('open'));
  document.querySelectorAll('.sidebar a').forEach(link => link.addEventListener('click', () => els.sidebar.classList.remove('open')));
  els.themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-theme');
    try { localStorage.setItem('crus_theme', isLight ? 'light' : 'dark'); } catch (_) {}
    els.themeToggle.querySelector('.side-hint').textContent = isLight ? 'Light' : 'Dark';
    els.themeToggle.querySelector('i').className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  });
  try {
    if (localStorage.getItem('crus_theme') === 'light') {
      document.body.classList.add('light-theme');
      els.themeToggle.querySelector('.side-hint').textContent = 'Light';
      els.themeToggle.querySelector('i').className = 'fa-solid fa-sun';
    }
  } catch (_) {}
  $('#year').textContent = new Date().getFullYear();
  setCustomCategoryVisibility(); updateCalculator(); render();
})();
