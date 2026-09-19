// 1. تحديد العناصر من الـ DOM
const title = document.getElementById('title');
const price = document.getElementById('price');
const taxes = document.getElementById('taxes');
const ads = document.getElementById('ads');
const discount = document.getElementById('discount');
const total = document.getElementById('total');
const count = document.getElementById('count');
const category = document.getElementById('category');
const submit = document.getElementById('submit');
const search = document.getElementById('search');
const searchTitleBtn = document.getElementById('searchTitle');
const searchCategoryBtn = document.getElementById('searchcategory');

let mood = 'create';
let tmpIndex;
let searchMood = 'title';

// 2. دالة حساب المجموع
function getTotal() {
    if (price.value !== '') {
        let result = (+price.value + +taxes.value + +ads.value) - +discount.value;
        total.innerHTML = result;
        total.style.background = '#048243';
    } else {
        total.innerHTML = '';
        total.style.background = '#a00d02';
    }
}

// استماع لأحداث الإدخال للحساب التلقائي
[price, taxes, ads, discount].forEach(input => {
    if (input) {
        input.addEventListener('input', getTotal);
    }
});

// 3. إدارة البيانات واسترجاعها من LocalStorage
let dataPro = localStorage.product ? JSON.parse(localStorage.product) : [];

// 4. دالة إنشاء أو تعديل المنتج عند الضغط على Create / Update
submit.onclick = function () {
    // التحقق من الحقول الأساسية
    if (title.value.trim() === '' || price.value.trim() === '' || category.value.trim() === '') {
        alert('الرجاء إدخال العنوان والسعر والقسم على الأقل!');
        return;
    }

    let countValue = count.value ? parseInt(count.value) : 1;

    let newPro = {
        title: title.value.toLowerCase().trim(),
        price: price.value,
        taxes: taxes.value || '0',
        ads: ads.value || '0',
        discount: discount.value || '0',
        total: total.innerHTML || price.value,
        count: countValue,
        category: category.value.toLowerCase().trim(),
    };

    if (mood === 'create') {
        if (countValue > 1) {
            for (let i = 0; i < countValue; i++) {
                dataPro.push(newPro);
            }
        } else {
            dataPro.push(newPro);
        }
    } else {
        dataPro[tmpIndex] = newPro;
        mood = 'create';
        submit.innerHTML = 'Create';
        if (count) count.style.display = 'block';
    }

    localStorage.setItem('product', JSON.stringify(dataPro));
    clearData();
    showData();
};

// 5. مسح بيانات الإدخال
function clearData() {
    title.value = '';
    price.value = '';
    taxes.value = '';
    ads.value = '';
    discount.value = '';
    total.innerHTML = '';
    if (count) count.value = '';
    category.value = '';
    total.style.background = '#a00d02';
}

// 6. عرض البيانات بالجدول مع فحص الأخطاء
function showData() {
    let tbody = document.querySelector('tbody');
    if (!tbody) return;

    let table = '';
    for (let i = 0; i < dataPro.length; i++) {
        // التأكد من أن العنصر موجود وليس null
        if (dataPro[i]) {
            table += `
            <tr>
                <td>${i + 1}</td>
                <td>${dataPro[i].title || ''}</td>
                <td>${dataPro[i].price || ''}</td>
                <td>${dataPro[i].taxes || ''}</td>
                <td>${dataPro[i].ads || ''}</td>
                <td>${dataPro[i].discount || ''}</td>
                <td>${dataPro[i].total || ''}</td>
                <td>${dataPro[i].category || ''}</td>
                <td><button onclick="updateData(${i})" class="btn-update">Update</button></td>
                <td><button onclick="deleteData(${i})" class="btn-delete">Delete</button></td>
            </tr>
            `;
        }
    }
    tbody.innerHTML = table;
}
showData();

// 7. حذف عنصر واحد
function deleteData(i) {
    dataPro.splice(i, 1);
    localStorage.product = JSON.stringify(dataPro);
    showData();
}

// 8. تعديل منتج
function updateData(i) {
    title.value = dataPro[i].title;
    price.value = dataPro[i].price;
    taxes.value = dataPro[i].taxes;
    ads.value = dataPro[i].ads;
    discount.value = dataPro[i].discount;
    getTotal();
    if (count) count.style.display = 'none';
    category.value = dataPro[i].category;
    submit.innerHTML = 'Update';
    mood = 'update';
    tmpIndex = i;
    scroll({ top: 0, behavior: 'smooth' });
}

// 9. إعدادات البحث
function getSearchMood(id) {
    if (id === 'searchTitle') {
        searchMood = 'title';
    } else {
        searchMood = 'category';
    }
    search.placeholder = 'Search By ' + searchMood;
    search.focus();
    search.value = '';
    showData();
}

if (searchTitleBtn) searchTitleBtn.onclick = () => getSearchMood('searchTitle');
if (searchCategoryBtn) searchCategoryBtn.onclick = () => getSearchMood('searchcategory');

if (search) {
    search.oninput = function () {
        let value = search.value.toLowerCase().trim();
        let tbody = document.querySelector('tbody');
        let table = '';

        for (let i = 0; i < dataPro.length; i++) {
            let match = searchMood === 'title' 
                ? dataPro[i].title.includes(value) 
                : dataPro[i].category.includes(value);

            if (match) {
                table += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${dataPro[i].title}</td>
                    <td>${dataPro[i].price}</td>
                    <td>${dataPro[i].taxes}</td>
                    <td>${dataPro[i].ads}</td>
                    <td>${dataPro[i].discount}</td>
                    <td>${dataPro[i].total}</td>
                    <td>${dataPro[i].category}</td>
                    <td><button onclick="updateData(${i})" class="btn-update">Update</button></td>
                    <td><button onclick="deleteData(${i})" class="btn-delete">Delete</button></td>
                </tr>
                `;
            }
        }
        tbody.innerHTML = table;
    };
}