document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const state = {
        budget: 0,
        items: [], // { id: string, photoDataUrl: string, price: number, checked: boolean }
        pendingPhoto: null // Data URL of the photo just taken
    };

    // --- DOM Elements ---
    const screens = {
        setup: document.getElementById('setup-screen'),
        main: document.getElementById('main-screen'),
        modal: document.getElementById('price-modal')
    };

    const inputs = {
        budget: document.getElementById('budget-input'),
        camera: document.getElementById('camera-input'),
        price: document.getElementById('price-input')
    };

    const buttons = {
        start: document.getElementById('start-btn'),
        cancelItem: document.getElementById('cancel-item-btn'),
        addItem: document.getElementById('add-item-btn'),
        downloadPdf: document.getElementById('download-pdf-btn')
    };

    const display = {
        budget: document.getElementById('disp-budget'),
        total: document.getElementById('disp-total'),
        balance: document.getElementById('disp-balance'),
        balanceBox: document.getElementById('balance-container'),
        itemList: document.getElementById('item-list'),
        previewImage: document.getElementById('preview-image')
    };

    // --- Formatters & Helpers ---
    const formatCurrency = (amount) => {
        return '¥' + amount.toLocaleString('ja-JP');
    };

    const generateId = () => {
        return 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    };

    // --- State Updates & Rendering ---
    const updateDashboard = () => {
        const total = state.items
            .filter(item => item.checked)
            .reduce((sum, item) => sum + item.price, 0);

        const balance = state.budget - total;

        display.budget.textContent = formatCurrency(state.budget);
        display.total.textContent = formatCurrency(total);
        display.balance.textContent = formatCurrency(balance);

        // Update balance color based on remaining amount
        display.balance.className = 'stat-value'; // Reset

        if (balance < 0) {
            display.balance.classList.add('balance-danger');
            // Check if any checkable items exist, might want to show a warning
        } else if (balance < state.budget * 0.2) {
            display.balance.classList.add('balance-warning');
        } else {
            display.balance.classList.add('balance-safe');
        }

    };

    const createItemElement = (item) => {
        const li = document.createElement('li');
        li.className = `item-card ${item.checked ? '' : 'unchecked'}`;
        li.dataset.id = item.id;

        li.innerHTML = `
            <div class="item-checkbox-container">
                <div class="custom-checkbox ${item.checked ? 'checked' : ''}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            </div>
            <img src="${item.photoDataUrl}" alt="商品" class="item-image">
            <div class="item-details">
                <div class="item-price">${formatCurrency(item.price)}</div>
                <button class="delete-btn" aria-label="削除">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;

        // Toggle click logic (entire card)
        li.addEventListener('click', (e) => {
            // もしゴミ箱ボタンがクリックされた場合はトグル処理は行わず削除処理へ
            if (e.target.closest('.delete-btn')) {
                deleteItem(item.id);
                return;
            }
            toggleItemCheck(item.id);
        });

        return li;
    };

    const renderItemList = () => {
        display.itemList.innerHTML = '';
        // Render in reverse order (newest first)
        const reversedItems = [...state.items].reverse();
        reversedItems.forEach(item => {
            display.itemList.appendChild(createItemElement(item));
        });
    };

    const toggleItemCheck = (id) => {
        const item = state.items.find(i => i.id === id);
        if (item) {
            item.checked = !item.checked;
            renderItemList();
            updateDashboard();
        }
    };

    const deleteItem = (id) => {
        // 確認ダイアログを表示
        if (confirm('この商品をリストから完全に削除しますか？')) {
            state.items = state.items.filter(item => item.id !== id);
            renderItemList();
            updateDashboard();
        }
    };

    const loadPhoto = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    };

    // --- Event Listeners ---

    // 1. Setup screen -> Main screen
    buttons.start.addEventListener('click', () => {
        const val = parseInt(inputs.budget.value, 10);
        if (isNaN(val) || val <= 0) {
            alert('よさんを いれてください。');
            return;
        }
        state.budget = val;

        // Transition screens
        screens.setup.classList.replace('screen_active', 'screen_hidden');
        screens.main.classList.replace('screen_hidden', 'screen_active');

        updateDashboard();
    });

    // 2. Camera Input handling
    inputs.camera.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const dataUrl = await loadPhoto(file);
            state.pendingPhoto = dataUrl;

            // Show modal
            display.previewImage.src = dataUrl;
            inputs.price.value = ''; // Reset price input
            screens.modal.classList.replace('modal_hidden', 'screen_active');

            // Wait slightly for DOM to update and modal to display before focusing
            setTimeout(() => {
                inputs.price.focus();
            }, 50);

            // Reset input so the same file could be selected again if needed
            inputs.camera.value = '';

        } catch (err) {
            console.error('Error reading file:', err);
            alert('しゃしんの よみこみに しっぱいしました。');
        }
    });

    // 3. Modal Actions
    buttons.cancelItem.addEventListener('click', () => {
        state.pendingPhoto = null;
        screens.modal.classList.replace('screen_active', 'modal_hidden');
    });

    buttons.addItem.addEventListener('click', () => {
        const val = parseInt(inputs.price.value, 10);
        if (isNaN(val) || val < 0) {
            alert('ねだんを ただしく いれてください。');
            return;
        }

        const newItem = {
            id: generateId(),
            photoDataUrl: state.pendingPhoto,
            price: val,
            checked: true
        };

        state.items.push(newItem);
        state.pendingPhoto = null;

        // Hide modal and update UI
        screens.modal.classList.replace('screen_active', 'modal_hidden');
        renderItemList();
        updateDashboard();
    });

    // 4. PDF Download
    if (buttons.downloadPdf) {
        buttons.downloadPdf.addEventListener('click', () => {
            // If no items, alert
            if (state.items.length === 0) {
                alert('リストに商品がありません。');
                return;
            }

            // PDF生成用に、元の要素のHTMLを維持したまま、一時的にタイトルを差し込む
            const originalArea = document.getElementById('pdf-content-area');
            const cloneArea = originalArea.cloneNode(true); // クローンを作成

            // タイトル要素を作成
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const day = today.getDate();
            const titleHtml = `<h1 style="text-align: center; margin-bottom: 20px; font-size: 1.5rem; color: #333;">${year}年${month}月${day}日　今日の買い物メモ</h1>`;

            // ゴミ箱ボタンなどはPDFで不要なので非表示にする
            const deleteBtns = cloneArea.querySelectorAll('.delete-btn');
            deleteBtns.forEach(btn => btn.style.display = 'none');

            // PDF用のラッパー要素を作成し、タイトルとリストクローンを結合
            const pdfWrapper = document.createElement('div');
            pdfWrapper.style.padding = '20px';
            pdfWrapper.innerHTML = titleHtml;
            pdfWrapper.appendChild(cloneArea);

            // html2pdfのオプション
            const opt = {
                margin: 10,
                filename: '買い物リスト_' + year + month + day + '.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // クローンしたラッパー要素からPDF生成開始
            html2pdf().from(pdfWrapper).set(opt).save().then(() => {
                console.log('PDF saved with title');
            });
        });
    }
});
