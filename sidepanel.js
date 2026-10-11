document.addEventListener('DOMContentLoaded', () => {
    const btnFetchSheet = document.getElementById('btn-fetch-sheet');
    const btnParseClipboard = document.getElementById('btn-parse-clipboard');
    const btnClear = document.getElementById('btn-clear');
    const aksiInputCard = document.getElementById('aksi-input-card');
    const aksiInputContent = document.getElementById('aksi-input-content');
    const toggleAksiInput = document.getElementById('toggle-aksi-input');
    const iconToggleAksi = document.getElementById('icon-toggle-aksi');
    const resultsSection = document.getElementById('results-section');
    const itemList = document.getElementById('item-list');
    const countBadge = document.getElementById('count-badge');
    const searchInput = document.getElementById('search-input');
    const toast = document.getElementById('toast');
    
    // Reload Button
    const btnReloadExt = document.getElementById('btn-reload-ext');
    if (btnReloadExt) {
        btnReloadExt.addEventListener('click', () => {
            // Menggunakan location.reload() agar side panel tidak tertutup
            location.reload();
        });
    }
    
    // Tab Elements
    const tabAksi = document.getElementById('tab-aksi');
    const tabBukti = document.getElementById('tab-bukti');
    const viewAksi = document.getElementById('view-aksi');
    const viewBukti = document.getElementById('view-bukti');
    
    // Drive Elements
    const btnFetchDrive = document.getElementById('btn-fetch-drive');
    const driveInputCard = document.getElementById('drive-input-card');
    const driveInputContent = document.getElementById('drive-input-content');
    const toggleDriveInput = document.getElementById('toggle-drive-input');
    const iconToggleDrive = document.getElementById('icon-toggle-drive');
    const btnClearDrive = document.getElementById('btn-clear-drive');
    const driveResultsSection = document.getElementById('drive-results-section');
    const driveList = document.getElementById('drive-list');
    const driveCountBadge = document.getElementById('drive-count-badge');
    const searchDriveInput = document.getElementById('search-drive-input');
    const inputTeksRealisasi = document.getElementById('input-teks-realisasi');

    let parsedData = [];
    let driveData = [];
    
    // --- COLLAPSE LOGIC ---
    let aksiInputExpanded = true;
    toggleAksiInput.addEventListener('click', () => {
        aksiInputExpanded = !aksiInputExpanded;
        aksiInputContent.style.display = aksiInputExpanded ? 'block' : 'none';
        iconToggleAksi.innerHTML = aksiInputExpanded 
            ? '<polyline points="18 15 12 9 6 15"></polyline>' 
            : '<polyline points="6 9 12 15 18 9"></polyline>';
    });

    let driveInputExpanded = true;
    toggleDriveInput.addEventListener('click', () => {
        driveInputExpanded = !driveInputExpanded;
        driveInputContent.style.display = driveInputExpanded ? 'block' : 'none';
        iconToggleDrive.innerHTML = driveInputExpanded 
            ? '<polyline points="18 15 12 9 6 15"></polyline>' 
            : '<polyline points="6 9 12 15 18 9"></polyline>';
    });

    function autoCollapseAksi() {
        if (aksiInputExpanded) toggleAksiInput.click();
    }

    function autoCollapseDrive() {
        if (driveInputExpanded) toggleDriveInput.click();
    }

    const defaultData = [
        { id: 1, sasaran: 'Meningkatnya daya tarik pariwisata', indikator: 'Persentase peningkatan promosi pariwisata', target: '5,88' },
        { id: 2, sasaran: 'Meningkatnya kawasan pengembangan pariwisata', indikator: 'Persentase SI DEWI MANDE', target: '50%' },
        { id: 3, sasaran: 'Meningkatnya Promosi pariwisata', indikator: 'Jumlah media promosi pariwisata yang digunakan', target: '17 Promosi' },
        { id: 4, sasaran: 'Meningkatnya program inovatif one village one event', indikator: 'Meningkatnya program inovatif one village one event', target: '4 Even' },
        { id: 5, sasaran: 'Meningkatnya kualitas ekosistem ekonomi kreatif', indikator: '1. Persentase peningkatan kapasitas SDM Ekraf', target: '14%' },
        { id: 6, sasaran: 'Meningkatnya kualitas ekosistem ekonomi kreatif', indikator: '2. Persentase produk ekonomi kreatif yang memiliki HKI', target: '18,25%' },
        { id: 7, sasaran: 'Meningkatnya kualitas ekosistem ekonomi kreatif', indikator: '3. Persentase peningkatan jumlah pelaku ekonomi kreatif', target: '6,67%' },
        { id: 8, sasaran: 'Meningkatnya produk ekonomi kreatif yang memilliki HKI', indikator: 'Jumlah produk Ekonomi Kreatif yang memiliki HKI', target: '5 HKI' }
    ];

    // Load saved data
    chrome.storage.local.get(['skpData', 'driveData'], (result) => {
        if (result.skpData && result.skpData.length > 0) {
            parsedData = result.skpData;
            renderList(parsedData);
        } else {
            // Load default template if empty
            parsedData = defaultData;
            chrome.storage.local.set({ skpData: parsedData });
            renderList(parsedData);
        }
        
        if (result.driveData && result.driveData.length > 0) {
            driveData = result.driveData;
            renderDriveList(driveData);
        }
    });

    function processText(text) {
        const data = parseTsv(text);
        if (data.length > 0) {
            parsedData = data;
            chrome.storage.local.set({ skpData: parsedData });
            renderList(parsedData);
            autoCollapseAksi();
            showToast('Data berhasil diproses!');
        } else {
            showToast('Format tidak dikenali!', true);
        }
    }

    btnFetchSheet.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url || !tab.url.includes('docs.google.com/spreadsheets')) {
                showToast('Silakan buka file Google Sheet terlebih dahulu!', true);
                return;
            }
            
            const match = tab.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (!match) {
                showToast('URL Google Sheet tidak valid!', true);
                return;
            }
            
            const spreadsheetId = match[1];
            let gid = '0';
            const gidMatch = tab.url.match(/[#&]gid=([0-9]+)/);
            if (gidMatch) {
                gid = gidMatch[1];
            }
            
            const originalHtml = btnFetchSheet.innerHTML;
            btnFetchSheet.textContent = 'Mengambil Data...';
            btnFetchSheet.disabled = true;
            
            const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv&gid=${gid}`;
            const response = await fetch(exportUrl);
            
            if (!response.ok) {
                throw new Error('Gagal mengunduh data. Pastikan Anda memiliki akses ke sheet ini.');
            }
            
            const text = await response.text();
            processText(text);
            
            btnFetchSheet.innerHTML = originalHtml;
            btnFetchSheet.disabled = false;
        } catch (error) {
            console.error(error);
            showToast('Error: ' + error.message, true);
            btnFetchSheet.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Ambil dari Google Sheet Aktif';
            btnFetchSheet.disabled = false;
        }
    });

    btnParseClipboard.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text || !text.trim()) {
                showToast('Clipboard kosong!', true);
                return;
            }
            processText(text);
        } catch (err) {
            console.error(err);
            showToast('Gagal membaca clipboard. Izinkan akses jika diminta.', true);
        }
    });

    btnClear.addEventListener('click', () => {
        if (confirm('Hapus semua data tersimpan?')) {
            parsedData = [];
            chrome.storage.local.remove(['skpData']);
            renderList([]);
        }
    });

    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        const filtered = parsedData.filter(item => 
            item.sasaran.toLowerCase().includes(keyword) || 
            item.indikator.toLowerCase().includes(keyword)
        );
        renderList(filtered);
    });

    // --- TAB LOGIC ---
    function switchTab(tabName) {
        tabAksi.classList.remove('active');
        tabAksi.style.background = 'transparent';
        tabAksi.style.color = 'var(--text-secondary)';
        tabBukti.classList.remove('active');
        tabBukti.style.background = 'transparent';
        tabBukti.style.color = 'var(--text-secondary)';
        
        viewAksi.style.display = 'none';
        viewBukti.style.display = 'none';

        if (tabName === 'aksi') {
            tabAksi.classList.add('active');
            tabAksi.style.background = 'var(--accent)';
            tabAksi.style.color = 'white';
            viewAksi.style.display = 'block';
        } else if (tabName === 'bukti') {
            tabBukti.classList.add('active');
            tabBukti.style.background = 'var(--accent)';
            tabBukti.style.color = 'white';
            viewBukti.style.display = 'block';
        }
    }

    tabAksi.addEventListener('click', () => switchTab('aksi'));
    tabBukti.addEventListener('click', () => switchTab('bukti'));

    // --- DRIVE LOGIC ---
    btnFetchDrive.addEventListener('click', () => {
        btnFetchDrive.disabled = true;
        btnFetchDrive.innerHTML = 'Sedang mencari...';
        
        chrome.tabs.query({url: "*://drive.google.com/*"}, (tabs) => {
            if (tabs.length === 0) {
                showToast('Buka folder Google Drive terlebih dahulu!', true);
                btnFetchDrive.innerHTML = 'Ambil Folder dari Drive Aktif';
                btnFetchDrive.disabled = false;
                return;
            }
            
            const driveTab = tabs.find(t => t.active) || tabs[0];
            
            const handleDriveResponse = (response) => {
                btnFetchDrive.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2c-.3-3-2.7-5.4-5.8-5.6-3.6-.2-6.6 2.5-7.1 5.9-.2.8-.2 1.7 0 2.5-1.9.5-3.3 2.1-3.4 4.1-.2 2.3 1.7 4.5 4 4.5h14c1.5 0 2.9-1 3.5-2.4 0-.1 0-.1-.1-1.6z"></path><path d="M12 11v7"></path><path d="M9 14l3-3 3 3"></path></svg> Ambil Folder dari Drive Aktif';
                btnFetchDrive.disabled = false;
                
                if (chrome.runtime.lastError) {
                    showToast('Gagal terhubung ke Drive. Coba refresh halaman Drive.', true);
                    return;
                }
                
                if (response && response.success) {
                    driveData = response.files;
                    chrome.storage.local.set({ driveData });
                    renderDriveList(driveData);
                    autoCollapseDrive();
                    showToast(`Berhasil mendapatkan ${driveData.length} file!`);
                } else {
                    showToast(response ? response.msg : 'Gagal mengekstrak data dari Drive', true);
                }
            };
            
            chrome.tabs.sendMessage(driveTab.id, { action: 'extractDriveFiles' }, (response) => {
                if (chrome.runtime.lastError) {
                    chrome.scripting.executeScript({
                        target: { tabId: driveTab.id },
                        files: ['content-drive.js']
                    }, () => {
                        if (chrome.runtime.lastError) {
                            handleDriveResponse(null);
                        } else {
                            chrome.tabs.sendMessage(driveTab.id, { action: 'extractDriveFiles' }, handleDriveResponse);
                        }
                    });
                    return;
                }
                handleDriveResponse(response);
            });
        });
    });
    
    btnClearDrive.addEventListener('click', () => {
        driveData = [];
        renderDriveList([]);
        if (!driveInputExpanded) toggleDriveInput.click();
        showToast('Data drive berhasil dibersihkan.');
    });

    searchDriveInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        const filtered = driveData.filter(item => item.name.toLowerCase().includes(keyword));
        renderDriveList(filtered);
    });

    function renderDriveList(files) {
        driveList.innerHTML = '';
        driveCountBadge.textContent = `${files.length} file`;
        
        if (files.length === 0) {
            driveResultsSection.style.display = 'none';
            return;
        }
        
        driveResultsSection.style.display = 'block';
        
        files.forEach((file, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'data-card';
            itemDiv.style.background = 'var(--surface)';
            itemDiv.style.border = '1px solid var(--border)';
            itemDiv.style.padding = '12px';
            itemDiv.style.borderRadius = '8px';
            itemDiv.style.marginBottom = '10px';
            
            const uniqueId = `drive-${Date.now()}-${index}`;
            
            itemDiv.innerHTML = `
                <div style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:600; letter-spacing:0.5px; margin-bottom:4px;">File Drive</div>
                <div style="font-weight:600; margin-bottom:6px; color:var(--text-primary); line-height:1.4; word-break: break-all;">${file.name}</div>
                <div style="display:flex; gap:6px; margin-top:12px; flex-direction:column;">
                    <div style="display:flex; gap:6px;">
                        <button class="btn-primary" style="flex:1; justify-content:center; background:#8b5cf6; font-size:11px;" id="isi-bukti-${uniqueId}" title="Isi form Bukti Dukung">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> 
                            Isi Bukti
                        </button>
                        <button class="btn-primary" style="flex:1; justify-content:center; background:#10b981; font-size:11px;" id="isi-realisasi-${uniqueId}" title="Isi form Realisasi">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> 
                            Isi Realisasi
                        </button>
                        <button class="copy-btn" style="padding:8px 10px;" id="copy-link-${uniqueId}" title="Copy Link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </div>
                </div>
            `;
            driveList.appendChild(itemDiv);

            setTimeout(() => {
                const isiBuktiBtn = document.getElementById(`isi-bukti-${uniqueId}`);
                const isiRealisasiBtn = document.getElementById(`isi-realisasi-${uniqueId}`);
                const copyLinkBtn = document.getElementById(`copy-link-${uniqueId}`);
                
                const sendToEkinerja = (actionType) => {
                    chrome.tabs.query({url: "*://*.bkn.go.id/*"}, (tabs) => {
                        const targetTab = tabs.find(t => t.url.includes('kinerja.bkn.go.id'));
                        if (targetTab) {
                            const handleBknResponse = (response) => {
                                if (response && response.success) {
                                    showToast(response.msg);
                                } else {
                                    showToast(response ? response.msg : 'Gagal terhubung! Coba reload tab e-kinerja.', true);
                                }
                            };
                            
                            const payload = { action: actionType, nama: file.name, link: file.link };
                            if (actionType === 'fillRealisasi') {
                                payload.teksRealisasi = inputTeksRealisasi.value || '';
                            }
                            
                            chrome.tabs.sendMessage(targetTab.id, payload, (response) => {
                                if (chrome.runtime.lastError) {
                                    chrome.scripting.executeScript({
                                        target: { tabId: targetTab.id },
                                        files: ['content-ekinerja.js']
                                    }, () => {
                                        if (chrome.runtime.lastError) {
                                            handleBknResponse(null);
                                        } else {
                                            chrome.tabs.sendMessage(targetTab.id, payload, handleBknResponse);
                                        }
                                    });
                                    return;
                                }
                                handleBknResponse(response);
                            });
                        } else {
                            showToast('Buka tab kinerja.bkn.go.id terlebih dahulu!', true);
                        }
                    });
                };

                if (isiBuktiBtn) isiBuktiBtn.onclick = () => sendToEkinerja('fillBukti');
                if (isiRealisasiBtn) isiRealisasiBtn.onclick = () => sendToEkinerja('fillRealisasi');
                
                if (copyLinkBtn) copyLinkBtn.onclick = () => copyToClipboard(file.link);
            }, 0);
        });
    }

    function parseTsv(text) {
        const lines = text.trim().split('\n');
        let lastSasaran = '';
        const results = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/\r/g, ''); 
            if (!line.trim()) continue;
            
            const cols = line.split('\t');
            
            if (cols.length >= 2) {
                let sasaran = cols[0] ? cols[0].trim() : '';
                const sasaranLower = sasaran.toLowerCase();
                
                // Skip header rows commonly found in SKP tables
                if (sasaranLower.includes('sasaran strategis') || sasaranLower === 'sasaran' || sasaranLower.includes('rencana hasil kerja')) {
                    continue;
                }

                if (sasaran) {
                    lastSasaran = sasaran;
                } else {
                    sasaran = lastSasaran;
                }
                
                let indikator = cols[1] ? cols[1].trim() : '';
                let target = cols[2] ? cols[2].trim() : '';
                
                // Hapus nomor urut di awal teks (misal: "1. ", "2. ")
                indikator = indikator.replace(/^\d+\.\s*/, '');
                target = target.replace(/^\d+\.\s*/, '');
                
                // Only push if there is an indikator (rencana aksi/indikator kinerja)
                if (sasaran && indikator) {
                    results.push({
                        id: Date.now() + i,
                        sasaran,
                        indikator,
                        target
                    });
                }
            }
        }
        return results;
    }

    function renderList(data) {
        itemList.innerHTML = '';
        countBadge.textContent = `${data.length} item`;

        if (data.length === 0) {
            resultsSection.style.display = 'none';
            return;
        }

        resultsSection.style.display = 'flex';

        // Kelompokkan berdasarkan Sasaran
        const grouped = {};
        data.forEach(item => {
            if (!grouped[item.sasaran]) {
                grouped[item.sasaran] = [];
            }
            grouped[item.sasaran].push(item);
        });

        // Render HTML
        for (const [sasaran, items] of Object.entries(grouped)) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'sasaran-group';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'group-header';
            headerDiv.innerHTML = `
                <div style="flex:1; padding-right:10px;">
                    <div style="font-size: 10px; color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Sasaran Strategis</div>
                    <div style="line-height: 1.3;">${sasaran} <span style="font-size: 11px; opacity:0.7; font-weight:normal;">(${items.length} aksi)</span></div>
                </div>
                <svg class="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            `;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'group-content';
            
            headerDiv.onclick = () => {
                headerDiv.classList.toggle('active');
                contentDiv.classList.toggle('active');
            };

            items.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'data-card';
                itemDiv.style.background = 'var(--surface)';
                itemDiv.style.border = '1px solid var(--border)';
                itemDiv.style.padding = '12px';
                itemDiv.style.borderRadius = '8px';
                
                const uniqueId = `${Date.now()}-${index}`;
                // Escape HTML to prevent broken layout if data contains < or >
                const escapeHTML = (str) => {
                    if (!str) return '';
                    return str.replace(/[&<>'"]/g, 
                        tag => ({
                            '&': '&amp;',
                            '<': '&lt;',
                            '>': '&gt;',
                            "'": '&#39;',
                            '"': '&quot;'
                        }[tag] || tag)
                    );
                };
                
                const safeIndikator = escapeHTML(item.indikator);
                const safeTarget = escapeHTML(item.target);
                
                // Gunakan innerHTML penuh untuk memastikan tombol terender
                itemDiv.innerHTML = `
                    <div style="margin-bottom: 12px;">
                        <div style="font-size: 11px; color: #60a5fa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            Indikator Kinerja Utama
                        </div>
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.4;">
                            ${safeIndikator}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 14px; padding: 8px 10px; background: rgba(0,0,0,0.25); border-radius: 6px; border-left: 3px solid ${item.target ? '#10b981' : '#ef4444'};">
                        <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 3px;">Target</div>
                        <div style="font-size: 13px; font-weight: 700; color: ${item.target ? '#f8fafc' : '#ef4444'};">
                            ${item.target ? safeTarget : 'Belum Ada (Kosong)'}
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary" style="flex: 1; padding: 10px 0; justify-content: center; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px;" id="isi-${uniqueId}" title="Isi Otomatis ke E-Kinerja">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                        <button class="copy-btn" style="flex: 1; padding: 10px 0; background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.2); border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" id="copy-${uniqueId}" title="Copy Text">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </div>
                `;
                
                contentDiv.appendChild(itemDiv);

                // Tambahkan event listener setelah elemen dimasukkan
                setTimeout(() => {
                    const isiBtn = document.getElementById(`isi-${uniqueId}`);
                    const copyBtn = document.getElementById(`copy-${uniqueId}`);
                    
                    if (isiBtn) {
                        isiBtn.onclick = () => {
                            chrome.tabs.query({url: "*://*.bkn.go.id/*"}, (tabs) => {
                                const targetTab = tabs.find(t => t.url.includes('kinerja.bkn.go.id'));
                                if (targetTab) {
                                    const handleAksiResponse = (response) => {
                                        if (response && response.success) {
                                            showToast(response.msg);
                                        } else {
                                            showToast(response ? response.msg : 'Gagal terhubung! Coba reload tab e-kinerja.', true);
                                        }
                                    };

                                    chrome.tabs.sendMessage(targetTab.id, { action: 'fillAksi', rencanaAksi: item.indikator, target: item.target }, (response) => {
                                        if (chrome.runtime.lastError) {
                                            chrome.scripting.executeScript({
                                                target: { tabId: targetTab.id },
                                                files: ['content-ekinerja.js']
                                            }, () => {
                                                if (chrome.runtime.lastError) {
                                                    handleAksiResponse(null);
                                                } else {
                                                    chrome.tabs.sendMessage(targetTab.id, { action: 'fillAksi', rencanaAksi: item.indikator, target: item.target }, handleAksiResponse);
                                                }
                                            });
                                            return;
                                        }
                                        handleAksiResponse(response);
                                    });
                                } else {
                                    showToast('Buka tab kinerja.bkn.go.id terlebih dahulu!', true);
                                }
                            });
                        };
                    }
                    
                    if (copyBtn) {
                        copyBtn.onclick = () => copyToClipboard(item.indikator);
                    }
                }, 0);
            });

            groupDiv.appendChild(headerDiv);
            groupDiv.appendChild(contentDiv);
            itemList.appendChild(groupDiv);
        }
    }

    async function copyToClipboard(text) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            showToast('Teks berhasil disalin!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Teks berhasil disalin!');
        }
    }

    let toastTimeout;
    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.style.background = isError ? '#ef4444' : '#10b981';
        toast.classList.add('show');
        
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
});
