class MaterialApp {
    constructor() {
        this.materials = JSON.parse(localStorage.getItem('obra_materials')) || [
            { id: 1, desc: 'Cimento', qtd: 5, unid: 'sacos', solicitante: 'Jamanta', status: 'Pedido solicitado', data_pedido: '2025-03-08', valor: 0, data_entrega: '', nota: '' }
        ];
        this.reports = JSON.parse(localStorage.getItem('obra_reports')) || [];
        this.works = JSON.parse(localStorage.getItem('obra_works')) || [];
        this.currentReportPhotos = [];
        this.workSearchQuery = '';
        this.materialSearchQuery = '';
        this.mode = 'solicitar';
        this.viewHistory = [];
        this.currentView = 'home-view';
        this.materialCart = [];
        this.storedLogo = localStorage.getItem('obra_logo_base64') || null;
        this.init();
    }

    init() {
        this.renderTable();
        this.setupForm();
        this.setupWorkForm();
    }

    switchView(viewId, isBack = false) {
        if (!isBack && this.currentView !== viewId) {
            this.viewHistory.push(this.currentView);
        }

        this.currentView = viewId;
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');
        lucide.createIcons();
    }

    goBack() {
        if (this.viewHistory.length > 0) {
            const previousView = this.viewHistory.pop();
            this.switchView(previousView, true);
        } else {
            this.switchView('home-view');
        }
    }

    goHome() {
        this.viewHistory = [];
        this.switchView('home-view');
    }

    enterMaterialMode(mode) {
        this.mode = mode;
        document.body.className = `mode-${mode}`;

        // Update Title
        const titleMap = {
            'solicitar': 'Solicitar Material',
            'processar': 'Processar Material',
            'historico': 'HistÃ³rico de SolicitaÃ§Ã­Âµes'
        };
        const titleEl = document.getElementById('material-view-title');
        if (titleEl) titleEl.innerText = titleMap[mode] || 'GestÃ­o de Materiais';

        // Show/Hide Novo Pedido button (only in solicitar mode)
        const btnAdd = document.querySelector('.btn-add');
        if (btnAdd) {
            btnAdd.style.display = mode === 'solicitar' ? 'flex' : 'none';
        }

        // Show/Hide search in history mode
        const searchContainer = document.getElementById('history-search-container');
        if (searchContainer) {
            searchContainer.style.display = mode === 'historico' ? 'block' : 'none';
        }
        this.materialSearchQuery = '';
        const searchInput = document.getElementById('material-history-search');
        if (searchInput) searchInput.value = '';

        // Reset Selection on mode switch
        const selectAll = document.getElementById('select-all-materials');
        if (selectAll) selectAll.checked = false;
        this.updateSelectionUI();

        this.renderTable();
        this.switchView('material-view');
    }

    renderTable() {
        const tbody = document.getElementById('materials-body');
        tbody.innerHTML = '';

        // Filter based on mode
        let filtered = this.materials;
        if (this.mode === 'solicitar' || this.mode === 'processar') {
            filtered = this.materials.filter(m => m.status === 'Pedido solicitado');
        } else if (this.mode === 'historico') {
            filtered = this.materials.filter(m => m.status !== 'Pedido solicitado');

            if (this.materialSearchQuery) {
                const query = this.materialSearchQuery.toLowerCase();
                filtered = filtered.filter(m =>
                    (m.desc && m.desc.toLowerCase().includes(query)) ||
                    (m.obra_name && m.obra_name.toLowerCase().includes(query))
                );
            }
        }

        filtered.forEach(item => {
            const tr = document.createElement('tr');
            const isProcessar = this.mode === 'processar';
            const isSolicitado = item.status === 'Pedido solicitado';
            tr.innerHTML = `
                ${isProcessar ? `
                    <td class="select-col" data-label="Selecionar">
                        <input type="checkbox" class="row-checkbox select-checkbox" 
                               data-id="${item.id}" 
                               onchange="app.updateSelectionUI()"
                               ${!isSolicitado ? 'disabled' : ''}>
                    </td>
                ` : ''}
                <td data-label="Data">${this.formatDate(item.data_pedido)}</td>
                <td data-label="DescriÃ§Ã­o">${item.desc}</td>
                <td data-label="Qtd">${item.qtd}</td>
                <td data-label="Unidade">${item.unid || '-'}</td>
                <td data-label="Obra">${item.obra_name || '-'}</td>
                <td data-label="Solicitante">${item.solicitante || '-'}</td>
                <td data-label="Valor" class="processor-info">R$ ${Number(item.valor || 0).toFixed(2)}</td>
                <td data-label="Status"><span class="status-badge status-${(item.status || 'solicitado').toLowerCase().replace(' ', '-')}">${item.status || 'Pedido solicitado'}</span></td>
                <td data-label="Processador" class="processor-info">${item.processador || '-'}</td>
                <td data-label="Processamento" class="processor-info">${this.formatDate(item.data_processamento)}</td>
                <td data-label="Entrega" class="processor-info">${this.formatDate(item.data_entrega)}</td>
                <td data-label="AÃ§Ã­Âµes">
                    <div class="btn-group" style="white-space: nowrap; display: flex; gap: 0.5rem; justify-content: flex-end;">
                        ${this.mode === 'historico' && item.status !== 'Entregue' ? `
                            <button class="action-btn" title="Marcar como Entregue" onclick="app.markAsDelivered(${item.id})" style="color:var(--success); border-color: rgba(34, 197, 94, 0.3)">
                                <i data-lucide="check-circle" style="width:16px; margin-right: 4px;"></i>
                                <span>Entregue</span>
                            </button>
                        ` : ''}
                        <button class="action-btn" title="${this.mode === 'processar' ? 'Processar' : 'Alterar'}" onclick="app.editEntry(${item.id})">
                            <i data-lucide="${this.mode === 'processar' ? 'clipboard-check' : 'edit-2'}" style="width:16px; margin-right: 4px;"></i>
                            <span>${this.mode === 'processar' ? 'Processar' : 'Alterar'}</span>
                        </button>
                        <button class="action-btn" title="Excluir" onclick="app.deleteEntry(${item.id})" style="color:var(--danger)">
                            <i data-lucide="trash-2" style="width:16px; margin-right: 4px;"></i>
                            <span>Excluir</span>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update summary
        let solicitado = 0;
        let pendente = 0;
        let entregue = 0;
        this.materials.forEach(m => {
            if (m.status === 'Entregue') entregue++;
            else if (m.status === 'Pendente' || m.status === 'Pedido aguardando entrega') pendente++;
            else solicitado++;
        });
        document.getElementById('total-solicitado').innerText = solicitado;
        document.getElementById('total-pendente').innerText = pendente;
        document.getElementById('total-entregue').innerText = entregue;

        localStorage.setItem('obra_materials', JSON.stringify(this.materials));
        lucide.createIcons();
        this.updateSelectionUI();
    }

    toggleAllSelection(selected) {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => {
            if (!cb.disabled) cb.checked = selected;
        });
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        const count = selectedCheckboxes.length;
        const bar = document.getElementById('bulk-action-bar');
        const countEl = document.getElementById('selected-count');

        if (countEl) countEl.innerText = count;
        if (bar) {
            if (count > 0 && this.mode === 'processar') {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        }
    }

    async processSelectedAndWhatsApp() {
        const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
        if (selectedCheckboxes.length === 0) return;

        const selectedIds = Array.from(selectedCheckboxes).map(cb => parseFloat(cb.dataset.id));
        const selectedMaterials = this.materials.filter(m => selectedIds.includes(m.id));

        if (selectedMaterials.length === 0) return;

        // Automatically determine greeting
        const hour = new Date().getHours();
        let periodo = "dia";
        if (hour >= 12 && hour < 18) periodo = "tarde";
        else if (hour >= 18 || hour < 5) periodo = "noite";

        // Group by Work ID
        const grouped = {};
        selectedMaterials.forEach(m => {
            const workId = m.obra_id;
            if (!grouped[workId]) grouped[workId] = [];
            grouped[workId].push(m);
        });

        const groupKeys = Object.keys(grouped);

        // Send by work
        groupKeys.forEach(workId => {
            const workMaterials = grouped[workId];
            const work = this.works.find(w => w.id == workId); // Loose equality for ID
            const obraName = work ? work.name : 'Obra nÃ­o identificada';
            const obraEndereco = work ? work.address : '';
            const obraPontoRef = work ? (work.reference || '') : '';

            let materialList = workMaterials.map(m => `- ${m.qtd} ${m.unid} de ${m.desc}`).join('\n');

            const fullEndereco = obraEndereco ? `\nLocal: ${obraEndereco}${obraPontoRef ? ` (Ref: ${obraPontoRef})` : ''}` : '';

            const text = encodeURIComponent(`Bom ${periodo}!\nEstamos precisando dos seguintes materiais na obra *${obraName}*:\n\n${materialList}${fullEndereco}\n\nPor favor, nos encaminhe a nota desse pedido o quanto antes para providenciarmos o pagamento da mesma.`);

            window.open(`https://wa.me/?text=${text}`, '_blank');
        });

        // Update status of all selected
        selectedIds.forEach(id => {
            const index = this.materials.findIndex(m => m.id === id);
            if (index !== -1) {
                this.materials[index].status = 'Pedido aguardando entrega';
                this.materials[index].data_processamento = new Date().toISOString().split('T')[0];
                if (!this.materials[index].processador) this.materials[index].processador = 'Sistemas';
            }
        });

        this.renderTable();

        // Reset check all
        const selectAll = document.getElementById('select-all-materials');
        if (selectAll) selectAll.checked = false;
    }

    async processSingleAndWhatsApp() {
        const id = document.getElementById('edit-id').value;
        if (!id) return;

        const unidSelect = document.getElementById('unid').value;
        const customUnid = document.getElementById('custom-unid') ? document.getElementById('custom-unid').value : '';
        const workId = document.getElementById('work-select').value;
        const workSelect = document.getElementById('work-select');
        const obraName = workSelect.selectedIndex >= 0 ? workSelect.options[workSelect.selectedIndex].text : '';

        const data = {
            id: parseFloat(id),
            desc: document.getElementById('desc').value,
            qtd: document.getElementById('qtd').value,
            unid: unidSelect === 'custom' ? customUnid : unidSelect,
            solicitante: document.getElementById('solicitante').value,
            status: 'Pedido aguardando entrega',
            data_pedido: document.getElementById('data_pedido').value,
            valor: document.getElementById('valor').value || 0,
            data_entrega: document.getElementById('data_entrega').value || '',
            nota: document.getElementById('nota').value || '',
            processador: document.getElementById('processador').value || '',
            data_processamento: document.getElementById('data_processamento').value || '',
            obra_id: workId,
            obra_name: obraName
        };

        const index = this.materials.findIndex(m => m.id === parseFloat(id));
        if (index !== -1) {
            this.materials[index] = data;
        }

        this.renderTable();
        this.closeModal();

        const work = this.works.find(w => w.id == workId); // Loose equality
        const obraEndereco = work ? work.address : '';
        const obraPontoRef = work ? (work.reference || '') : '';

        const hour = new Date().getHours();
        let periodo = "dia";
        if (hour >= 12 && hour < 18) periodo = "tarde";
        else if (hour >= 18 || hour < 5) periodo = "noite";

        const materialList = `- ${data.qtd} ${data.unid} de ${data.desc}`;
        const fullEndereco = obraEndereco ? `\nLocal: ${obraEndereco}${obraPontoRef ? ` (Ref: ${obraPontoRef})` : ''}` : '';

        const text = encodeURIComponent(`Bom ${periodo}!\nEstamos precisando do seguinte material na obra *${obraName}*:\n\n${materialList}${fullEndereco}\n\nPor favor, nos encaminhe a nota desse pedido o quanto antes para providenciarmos o pagamento da mesma.`);

        window.open(`https://wa.me/?text=${text}`, '_blank');
    }

    handleMaterialSearch(query) {
        this.materialSearchQuery = query;
        this.renderTable();
    }


    formatDate(dateStr) {
        if (!dateStr) return '-';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    setupForm() {
        const form = document.getElementById('material-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;

            // If we are in "Solicitar" mode and there are items in the cart or fields are filled, process them
            if (this.mode === 'solicitar' && !id) {
                // If fields are filled, try to add the current item to the cart first
                const currentDesc = document.getElementById('desc').value;
                const currentQtd = document.getElementById('qtd').value;
                if (currentDesc && currentQtd) {
                    this.addToCart();
                }

                if (this.materialCart.length > 0) {
                    this.materialCart.forEach(item => {
                        this.materials.push({
                            ...item,
                            id: Date.now() + Math.random(), // Unique ID for each
                            status: 'Pedido solicitado'
                        });
                    });
                    this.materialCart = [];
                    this.renderTable();
                    this.closeModal();
                    return;
                }
            }

            // Regular single-item save logic (for editing or single requests)
            const unidSelect = document.getElementById('unid').value;
            const customUnid = document.getElementById('custom-unid') ? document.getElementById('custom-unid').value : '';

            const data = {
                id: id ? parseFloat(id) : Date.now(),
                desc: document.getElementById('desc').value,
                qtd: document.getElementById('qtd').value,
                unid: unidSelect === 'custom' ? customUnid : unidSelect,
                solicitante: document.getElementById('solicitante').value,
                status: (this.mode === 'historico' && id) ? (document.getElementById('status-editor').value || 'Pedido aguardando entrega') : ((this.mode === 'processar' || (id && this.materials.find(m => m.id === parseFloat(id)).status !== 'Pedido solicitado')) ? 'Pedido aguardando entrega' : 'Pedido solicitado'),
                data_pedido: document.getElementById('data_pedido').value,
                valor: document.getElementById('valor').value || 0,
                data_entrega: document.getElementById('data_entrega').value || '',
                nota: document.getElementById('nota').value || '',
                processador: document.getElementById('processador').value || '',
                data_processamento: document.getElementById('data_processamento').value || '',
                obra_id: document.getElementById('work-select').value,
                obra_name: document.getElementById('work-select').options[document.getElementById('work-select').selectedIndex].text
            };

            if (id) {
                const index = this.materials.findIndex(m => m.id === parseFloat(id));
                this.materials[index] = data;
            } else {
                if (!data.desc || !data.qtd) {
                    alert('Por favor, preencha a descriÃ§Ã­o e a quantidade.');
                    return;
                }
                this.materials.push(data);
            }

            this.renderTable();
            this.closeModal();
        };
    }

    addToCart() {
        const desc = document.getElementById('desc').value;
        const qtd = document.getElementById('qtd').value;
        const unidSelect = document.getElementById('unid').value;
        const customUnid = document.getElementById('custom-unid') ? document.getElementById('custom-unid').value : '';
        const workSelect = document.getElementById('work-select');
        const solicitante = document.getElementById('solicitante').value;
        const data_pedido = document.getElementById('data_pedido').value;

        if (!desc || !qtd || !workSelect.value || !solicitante || !data_pedido) {
            alert('Preencha os dados da obra, solicitante e os campos do material antes de adicionar ao bloco.');
            return;
        }

        const item = {
            tempId: Date.now(),
            desc,
            qtd,
            unid: unidSelect === 'custom' ? customUnid : unidSelect,
            solicitante,
            data_pedido,
            obra_id: workSelect.value,
            obra_name: workSelect.options[workSelect.selectedIndex].text,
            valor: 0,
            data_entrega: '',
            nota: '',
            processador: '',
            data_processamento: ''
        };

        this.materialCart.push(item);

        // Clear all item fields
        document.getElementById('desc').value = '';
        document.getElementById('qtd').value = '';
        document.getElementById('unid').value = '';
        if (document.getElementById('custom-unid')) {
            document.getElementById('custom-unid').value = '';
            document.getElementById('custom-unid-group').style.display = 'none';
        }
        document.querySelectorAll('.material-chip').forEach(c => c.classList.remove('selected'));
        if (document.getElementById('custom-material-group')) document.getElementById('custom-material-group').style.display = 'none';

        this.renderCart();
    }

    removeFromCart(tempId) {
        this.materialCart = this.materialCart.filter(item => item.tempId !== tempId);
        this.renderCart();
    }

    renderCart() {
        const cartSection = document.getElementById('cart-section');
        const cartList = document.getElementById('cart-list');
        const cartCount = document.getElementById('cart-count');

        if (this.materialCart.length > 0) {
            cartSection.style.display = 'block';
            cartCount.innerText = this.materialCart.length;
            cartList.innerHTML = `
                <table class="cart-table">
                    <thead>
                        <tr>
                            <th>Qtd</th>
                            <th>Unid</th>
                            <th>DescriÃ§Ã­o</th>
                            <th style="width: 40px"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.materialCart.map(item => `
                            <tr>
                                <td><strong>${item.qtd}</strong></td>
                                <td>${item.unid}</td>
                                <td>${item.desc}</td>
                                <td style="text-align: center">
                                    <button type="button" class="cart-btn-remove" onclick="app.removeFromCart(${item.tempId})">
                                        <i data-lucide="trash-2" style="width:16px"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            lucide.createIcons();
        } else {
            cartSection.style.display = 'none';
        }
    }

    setupWorkForm() {
        const form = document.getElementById('work-form');
        if (!form) return;
        form.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('work-id').value;
            const data = {
                id: id ? parseInt(id) : Date.now(),
                name: document.getElementById('work-name').value,
                address: document.getElementById('work-address').value,
                reference: document.getElementById('work-reference').value,
                owner: document.getElementById('work-owner').value,
                phone: document.getElementById('work-phone').value,
                date_created: id ? this.works.find(w => w.id === parseInt(id)).date_created : new Date().toISOString()
            };

            if (id) {
                const index = this.works.findIndex(w => w.id === parseInt(id));
                this.works[index] = data;
                alert('Obra atualizada com sucesso!');
            } else {
                this.works.push(data);
                alert('Obra cadastrada com sucesso!');
            }

            localStorage.setItem('obra_works', JSON.stringify(this.works));
            form.reset();
            document.getElementById('work-id').value = '';
            this.switchView('works-view');
        };
    }

    enterWorksMode(mode) {
        if (mode === 'cadastrar') {
            document.getElementById('work-form').reset();
            document.getElementById('work-id').value = '';
            this.switchView('works-create-view');
        } else if (mode === 'buscar') {
            this.workSearchQuery = '';
            const searchInput = document.getElementById('work-search');
            if (searchInput) searchInput.value = '';
            this.renderWorksList();
            this.switchView('works-list-view');
        }
    }

    handleWorkSearch(query) {
        this.workSearchQuery = query.toLowerCase();
        this.renderWorksList();
    }

    renderWorksList() {
        const tbody = document.getElementById('works-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (this.works.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Nenhuma obra cadastrada ainda.</td></tr>';
            return;
        }

        let filtered = this.works;
        if (this.workSearchQuery) {
            filtered = this.works.filter(w => w.name.toLowerCase().includes(this.workSearchQuery));
        }

        // Sort by date (descending)
        const sortedWorks = [...filtered].sort((a, b) => new Date(b.date_created) - new Date(a.date_created));

        sortedWorks.forEach(work => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Data">${this.formatDate(work.date_created.split('T')[0])}</td>
                <td data-label="Nome">${work.name}</td>
                <td data-label="EndereÃ§o">${work.address}</td>
                <td data-label="ReferÃªncia">${work.reference || '-'}</td>
                <td data-label="ProprietÃ­Â¡rio">${work.owner}</td>
                <td data-label="Telefone">${work.phone}</td>
                <td data-label="AÃ§Ã­Âµes">
                    <div class="btn-group" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="action-btn" title="Editar" onclick="app.editWork(${work.id})">
                            <i data-lucide="edit-2" style="width:16px; margin-right: 4px;"></i>
                            <span>Editar</span>
                        </button>
                        <button class="action-btn" title="Excluir" onclick="app.deleteWork(${work.id})" style="color:var(--danger)">
                            <i data-lucide="trash-2" style="width:16px; margin-right: 4px;"></i>
                            <span>Excluir</span>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    }

    editWork(id) {
        const work = this.works.find(w => w.id === id);
        if (work) {
            document.getElementById('work-id').value = work.id;
            document.getElementById('work-name').value = work.name;
            document.getElementById('work-address').value = work.address;
            document.getElementById('work-reference').value = work.reference || '';
            document.getElementById('work-owner').value = work.owner;
            document.getElementById('work-phone').value = work.phone;
            this.switchView('works-create-view');
        }
    }

    deleteWork(id) {
        if (confirm('Tem certeza que deseja excluir esta obra?')) {
            this.works = this.works.filter(w => w.id !== id);
            localStorage.setItem('obra_works', JSON.stringify(this.works));
            this.renderWorksList();
        }
    }

    selectMaterial(material) {
        // Deselect others
        document.querySelectorAll('.material-chip').forEach(c => c.classList.remove('selected'));
        // Find chip and select
        const chips = Array.from(document.querySelectorAll('.material-chip'));
        const chip = chips.find(c => c.innerText === material);
        if (chip) chip.classList.add('selected');

        document.getElementById('desc').value = material;
        document.getElementById('custom-material-group').style.display = 'none';
    }

    toggleCustomMaterial() {
        document.querySelectorAll('.material-chip').forEach(c => c.classList.remove('selected'));
        document.getElementById('custom-material-group').style.display = 'block';
        document.getElementById('desc').value = '';
        document.getElementById('desc').focus();
    }

    openModal(data = null) {
        if (!data && this.works.length === 0) {
            alert('VocÃª precisa cadastrar uma obra antes de fazer um pedido!');
            this.switchView('works-create-view');
            return;
        }

        const workSelect = document.getElementById('work-select');
        if (workSelect) {
            workSelect.innerHTML = '<option value="" disabled selected>Escolha a obra...</option>';
            this.works.forEach(work => {
                const option = document.createElement('option');
                option.value = work.id;
                option.textContent = work.name;
                workSelect.appendChild(option);
            });
        }

        document.getElementById('material-modal').style.display = 'flex';

        const isProcessar = this.mode === 'processar';
        const isHistorico = this.mode === 'historico';
        const modalTitle = document.getElementById('modal-title');
        const solicitarGrp = document.getElementById('solicitar-group');
        const processarGrp = document.getElementById('processar-group');
        const requestSum = document.getElementById('request-summary');
        const submitBtnText = document.getElementById('btn-submit-text');
        const itemArea = document.getElementById('solicitar-item-area');
        const cartBtn = document.getElementById('btn-add-to-cart');

        // Defaults for all modes
        document.body.classList.remove('mode-solicitar', 'mode-processar', 'mode-historico');
        document.body.classList.add(`mode-${this.mode}`);

        if (solicitarGrp) solicitarGrp.style.display = 'block';
        if (processarGrp) processarGrp.style.display = 'block';
        if (requestSum) requestSum.style.display = 'none';
        if (itemArea) itemArea.style.display = 'block';
        if (cartBtn) cartBtn.style.display = 'none';

        const statusGroupEditor = document.getElementById('status-group-editor');
        if (statusGroupEditor) statusGroupEditor.style.display = 'none';

        const whatsappBtn = document.getElementById('btn-save-request-whatsapp');
        if (whatsappBtn) whatsappBtn.style.display = 'none';

        if (isProcessar && !isHistorico) {
            if (modalTitle) modalTitle.innerText = 'Processar Pedido';
            if (solicitarGrp) solicitarGrp.style.display = 'none';
            if (itemArea) itemArea.style.display = 'none';
            if (requestSum) requestSum.style.display = 'block';
            if (submitBtnText) submitBtnText.innerText = 'Apenas Processar';
            if (whatsappBtn) whatsappBtn.style.display = 'inline-flex';

            const workSelectEl = document.getElementById('work-select');
            if (workSelectEl) workSelectEl.required = false;
            const dataPedidoEl = document.getElementById('data_pedido');
            if (dataPedidoEl) dataPedidoEl.required = false;
            const solicitanteEl = document.getElementById('solicitante');
            if (solicitanteEl) solicitanteEl.required = false;
            const processadorEl = document.getElementById('processador');
            if (processadorEl) processadorEl.required = true;
            const dataProcessamentoEl = document.getElementById('data_processamento');
            if (dataProcessamentoEl) dataProcessamentoEl.required = true;
        } else if (isHistorico && data) {
            if (modalTitle) modalTitle.innerText = 'Alterar Pedido HistÃ³rico';
            if (submitBtnText) submitBtnText.innerText = 'Salvar AlteraÃ§Ã­Âµes';

            const workSelectEl = document.getElementById('work-select');
            if (workSelectEl) workSelectEl.required = true;
            const dataPedidoEl = document.getElementById('data_pedido');
            if (dataPedidoEl) dataPedidoEl.required = true;
            const solicitanteEl = document.getElementById('solicitante');
            if (solicitanteEl) solicitanteEl.required = true;
            const processadorEl = document.getElementById('processador');
            if (processadorEl) processadorEl.required = false;
            const dataProcessamentoEl = document.getElementById('data_processamento');
            if (dataProcessamentoEl) dataProcessamentoEl.required = false;
            if (document.getElementById('status-group-editor')) document.getElementById('status-group-editor').style.display = 'block';
        } else {
            if (modalTitle) modalTitle.innerText = data ? 'Alterar Pedido' : 'Novo Pedido';
            if (processarGrp) processarGrp.style.display = 'none';
            if (submitBtnText) submitBtnText.innerText = data ? 'Salvar AlteraÃ§Ã­Âµes' : 'Finalizar SolicitaÃ§Ã­o';
            if (cartBtn && !data) cartBtn.style.display = 'inline-flex';

            const workSelectEl = document.getElementById('work-select');
            if (workSelectEl) workSelectEl.required = true;
            const dataPedidoEl = document.getElementById('data_pedido');
            if (dataPedidoEl) dataPedidoEl.required = true;
            const solicitanteEl = document.getElementById('solicitante');
            if (solicitanteEl) solicitanteEl.required = true;
            const processadorEl = document.getElementById('processador');
            if (processadorEl) processadorEl.required = false;
            const dataProcessamentoEl = document.getElementById('data_processamento');
            if (dataProcessamentoEl) dataProcessamentoEl.required = false;
        }

        // Reset Cart logic
        this.materialCart = [];
        this.renderCart();

        document.getElementById('custom-material-group').style.display = 'none';
        document.querySelectorAll('.material-chip').forEach(c => c.classList.remove('selected'));

        if (data) {
            const editIdEl = document.getElementById('edit-id');
            if (editIdEl) editIdEl.value = data.id;
            const descEl = document.getElementById('desc');
            if (descEl) descEl.value = data.desc || '';
            const qtdEl = document.getElementById('qtd');
            if (qtdEl) qtdEl.value = data.qtd || '';

            // Show custom input field if editing existing text that doesn't trigger chips
            if (data.desc) {
                document.getElementById('custom-material-group').style.display = 'block';
            }

            // Populate Summary (for processor mode)
            const sumDesc = document.getElementById('sum-desc');
            const sumQtd = document.getElementById('sum-qtd');
            const sumUnid = document.getElementById('sum-unid');
            const sumSolicitante = document.getElementById('sum-solicitante');
            const sumData = document.getElementById('sum-data');

            if (sumDesc) sumDesc.innerText = data.desc || '-';
            if (sumQtd) sumQtd.innerText = data.qtd || '-';
            if (sumUnid) sumUnid.innerText = data.unid || '';
            if (sumSolicitante) sumSolicitante.innerText = data.solicitante || '-';
            if (sumData) sumData.innerText = data.data_pedido ? this.formatDate(data.data_pedido) : '-';

            // Handle unit loading
            const unitSelect = document.getElementById('unid');
            const standardUnits = ['kg', 'sacos', 'mÃ­â€šÃ‚Â³', 'mÃ­â€šÃ‚Â²', 'unid', 'pacotes', 'milheiros'];
            if (unitSelect) {
                if (standardUnits.includes(data.unid)) {
                    unitSelect.value = data.unid;
                    document.getElementById('custom-unid-group').style.display = 'none';
                } else if (data.unid) {
                    unitSelect.value = 'custom';
                    document.getElementById('custom-unid-group').style.display = 'block';
                    document.getElementById('custom-unid').value = data.unid;
                } else {
                    unitSelect.value = '';
                    document.getElementById('custom-unid-group').style.display = 'none';
                }
            }

            const workSelectEl = document.getElementById('work-select');
            if (workSelectEl) workSelectEl.value = data.obra_id || '';
            const solicitanteEl = document.getElementById('solicitante');
            if (solicitanteEl) solicitanteEl.value = data.solicitante || '';
            const dataPedidoEl = document.getElementById('data_pedido');
            if (dataPedidoEl) dataPedidoEl.value = data.data_pedido || '';

            const valorEl = document.getElementById('valor');
            if (valorEl) valorEl.value = data.valor || '';
            const statusEditorEl = document.getElementById('status-editor');
            if (statusEditorEl) statusEditorEl.value = data.status || 'Pedido aguardando entrega';
            const dataEntregaEl = document.getElementById('data_entrega');
            if (dataEntregaEl) dataEntregaEl.value = data.data_entrega || '';
            const notaEl = document.getElementById('nota');
            if (notaEl) notaEl.value = data.nota || '';
            const processadorEl = document.getElementById('processador');
            if (processadorEl) processadorEl.value = data.processador || '';
            const dataProcessamentoEl = document.getElementById('data_processamento');
            if (dataProcessamentoEl) dataProcessamentoEl.value = data.data_processamento || new Date().toISOString().split('T')[0];
        } else {
            const matForm = document.getElementById('material-form');
            if (matForm) matForm.reset();
            const editIdEl = document.getElementById('edit-id');
            if (editIdEl) editIdEl.value = '';
            const dataPedidoEl = document.getElementById('data_pedido');
            if (dataPedidoEl) dataPedidoEl.value = new Date().toISOString().split('T')[0];
            const dataProcessamentoEl = document.getElementById('data_processamento');
            if (dataProcessamentoEl) dataProcessamentoEl.value = new Date().toISOString().split('T')[0];
            const customUnidGrp = document.getElementById('custom-unid-group');
            if (customUnidGrp) customUnidGrp.style.display = 'none';
        }
    }

    checkCustomUnit(value) {
        const group = document.getElementById('custom-unid-group');
        const customField = document.getElementById('custom-unid');
        if (value === 'custom') {
            group.style.display = 'block';
            customField.required = this.mode === 'solicitar';
            customField.focus();
        } else {
            group.style.display = 'none';
            customField.required = false;
        }
    }

    closeModal() {
        document.getElementById('material-modal').style.display = 'none';
    }

    editEntry(id) {
        const item = this.materials.find(m => m.id === id);
        this.openModal(item);
    }

    deleteEntry(id) {
        if (confirm('Tem certeza que deseja excluir este registro?')) {
            this.materials = this.materials.filter(m => m.id !== id);
            this.renderTable();
        }
    }

    markAsDelivered(id) {
        const index = this.materials.findIndex(m => m.id === id);
        if (index !== -1) {
            this.materials[index].status = 'Entregue';
            this.materials[index].data_entrega = new Date().toISOString().split('T')[0];
            this.renderTable();
        }
    }

    // --- Report Management ---

    enterReportMode(mode) {
        if (mode === 'criar') {
            const workSelect = document.getElementById('report-work-select');
            if (workSelect) {
                workSelect.innerHTML = '<option value="" disabled selected>Escolha a obra...</option>';
                this.works.forEach(work => {
                    const option = document.createElement('option');
                    option.value = work.id;
                    option.textContent = work.name;
                    workSelect.appendChild(option);
                });
            }

            this.currentReportPhotos = [];
            this.setupPhotoUpload(4); // Default to 4
            document.getElementById('report-photo-count').value = '4';
            this.switchView('report-create-view');
        } else if (mode === 'buscar') {
            this.renderReportHistory();
            this.switchView('report-history-view');
        }
    }

    setupPhotoUpload(count) {
        const grid = document.getElementById('photo-upload-grid');
        grid.innerHTML = '';
        this.currentReportPhotos = new Array(parseInt(count)).fill(null);

        for (let i = 0; i < count; i++) {
            const slot = document.createElement('div');
            slot.className = 'photo-slot';
            slot.onclick = (e) => this.triggerPhotoUpload(i, e);
            slot.id = `photo-slot-${i}`;

            slot.innerHTML = `
                <div class="slot-placeholder">
                    <i data-lucide="camera"></i>
                    <span>Foto ${i + 1}</span>
                </div>
                <input type="file" id="file-input-${i}" style="display:none" accept="image/*" onchange="app.handlePhotoUpload(event, ${i})">
            `;
            grid.appendChild(slot);
        }
        lucide.createIcons();
        this.updateReportActions();
    }

    triggerPhotoUpload(index, event) {
        if (event && event.target.tagName.toLowerCase() === 'select') return;
        const input = document.getElementById(`file-input-${index}`);
        if (input) input.click();
    }

    async handlePhotoUpload(event, index) {
        let file = event.target.files[0];
        if (!file) return;

        const slot = document.getElementById(`photo-slot-${index}`);
        slot.classList.add('loading');

        try {
            // Suporte para HEIC (iPhone)
            if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
                if (window.heic2any) {
                    const blob = await heic2any({
                        blob: file,
                        toType: "image/jpeg",
                        quality: 0.7
                    });
                    file = Array.isArray(blob) ? blob[0] : blob;
                }
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageData = e.target.result;
                try {
                    const standardizedData = await this.standardizeImage(imageData);
                    this.currentReportPhotos[index] = {
                        src: standardizedData,
                        title: 'Registro da obra'
                    };
                    this.renderPhotoSlot(index);
                    this.updateReportActions();
                } catch (err) {
                    console.error('Erro ao processar imagem:', err);
                } finally {
                    slot.classList.remove('loading');
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Erro na conversão HEIC:', err);
            slot.classList.remove('loading');
            alert('Não foi possível processar esta foto do iPhone.');
        }
    }

    standardizeImage(base64Str) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const targetWidth = 1280;
                const targetHeight = 720; // 16:9
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const imgAspectRatio = img.width / img.height;
                const targetAspectRatio = targetWidth / targetHeight;

                let renderWidth, renderHeight, offsetX, offsetY;
                if (imgAspectRatio > targetAspectRatio) {
                    renderHeight = targetHeight;
                    renderWidth = img.width * (targetHeight / img.height);
                    offsetX = (targetWidth - renderWidth) / 2;
                    offsetY = 0;
                } else {
                    renderWidth = targetWidth;
                    renderHeight = img.height * (targetWidth / img.width);
                    offsetX = 0;
                    offsetY = (targetHeight - renderHeight) / 2;
                }

                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, targetWidth, targetHeight);
                ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
                
                try {
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } catch(e) {
                    // Fallback to original image if canvas throws Tainted error
                    resolve(base64Str);
                }
            };
            img.onerror = () => {
                reject(new Error("Failed to load image for standardization"));
            };
            img.src = base64Str;
        });
    }

    async handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                this.storedLogo = base64;
                localStorage.setItem('obra_logo_base64', base64);
                alert('Logo configurada com sucesso!');
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Erro ao fazer upload da logo:', err);
            alert('Erro ao processar a logo.');
        }
    }

    getImageAsBase64(url) {
        return new Promise((resolve) => {
            const img = new Image();
            // REMOVE crossOrigin for local files to avoid CORS issues on file:// protocol
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataURL);
                } catch (e) {
                    console.error("Canvas conversion failed for " + url, e);
                    resolve(null); // Resolve with null instead of rejecting to keep the flow
                }
            };
            img.onerror = () => {
                console.error("Image load failed for " + url);
                resolve(null);
            };
            img.src = url;
        });
    }

    renderPhotoSlot(index) {
        const slot = document.getElementById(`photo-slot-${index}`);
        const photo = this.currentReportPhotos[index];
        if (!photo) return;

        // CRITICAL FIX: Keep the input but hide standard UI
        slot.innerHTML = `
            <img src="${photo.src}" alt="Foto ${index + 1}">
            <div class="photo-tools" onclick="event.stopPropagation()">
                <select class="photo-caption-select" 
                       onchange="app.updatePhotoTitle(${index}, this.value)">
                    <option value="Registro da obra" ${photo.title === 'Registro da obra' ? 'selected' : ''}>Registro da obra</option>
                    <option value="Registro de chegada de material" ${photo.title === 'Registro de chegada de material' ? 'selected' : ''}>Registro de chegada de material</option>
                </select>
                <button class="action-btn-mini" onclick="app.triggerPhotoUpload(${index}, event)" title="Trocar Foto">
                    <i data-lucide="refresh-cw"></i>
                </button>
            </div>
            <input type="file" id="file-input-${index}" style="display:none" accept="image/*" onchange="app.handlePhotoUpload(event, ${index})">
        `;
        lucide.createIcons();
    }

    updatePhotoTitle(index, title) {
        if (this.currentReportPhotos[index]) {
            this.currentReportPhotos[index].title = title;
        }
    }

    updateReportActions() {
        const uploadedCount = this.currentReportPhotos.filter(p => p !== null).length;
        const actions = document.querySelector('.report-actions');
        if (actions) actions.style.display = uploadedCount === this.currentReportPhotos.length ? 'flex' : 'none';
    }

    previewReport() {
        const modal = document.getElementById('report-preview-modal');
        const content = document.getElementById('report-preview-content');

        const workSelect = document.getElementById('report-work-select');
        const selectedWorkId = workSelect ? workSelect.value : '';
        let workName = "Obra nao selecionada";
        let owner = "Não informado";
        let address = "Não informado";
        let phone = "Não informado";
        let reference = "Não informado";

        if (selectedWorkId && this.works) {
            const work = this.works.find(w => w.id == selectedWorkId);
            if (work) {
                workName = work.name;
                owner = work.owner || "Não informado";
                address = work.address || "Não informado";
                phone = work.phone || "Não informado";
                reference = work.reference || "Não informado";
            }
        }

        let html = `
            <div style="font-family: Arial, sans-serif; background: white; padding: 20px; box-sizing: border-box; color: #000; position: relative;">
                <div style="text-align: center; margin-bottom: 5px;">
                    <img src="${this.storedLogo || 'logo_cabecalho.jpg'}" style="max-height: 70px; display: block; margin: 0 auto 10px;">
                    <p style="font-size: 11px; font-weight: bold; margin: 2px 0;">CNPJ: 19.737.981.0001-82 / CONTATO: (91) 98453-0611</p>
                    <p style="font-size: 10px; font-weight: bold; margin: 2px 0;">ENDERECO: RUA CORONEL RAIMUNDO LEAO N 1202 - BAIRRO CENTRO - CAMETA-PA</p>
                </div>
                <div style="height: 12px; background: #01433B; width: 100%; margin: 10px 0 20px;"></div>
                <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="color: #01433B; font-size: 20px; margin: 0; font-weight: bold;">RELATORIO FOTOGRAFICO</h1>
                </div>
                <div style="margin-bottom: 25px; padding-left: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
                    <p style="margin: 0;"><strong>Obra:</strong> ${workName}</p>
                    <p style="margin: 0;"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                    <p style="margin: 0;"><strong>Proprietário:</strong> ${owner}</p>
                    <p style="margin: 0;"><strong>Telefone:</strong> ${phone}</p>
                    <p style="margin: 0; grid-column: 1 / span 2;"><strong>Endereço:</strong> ${address} ${reference ? `(Ref: ${reference})` : ''}</p>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; min-height: 400px; padding: 0 10px;">
        `;

        this.currentReportPhotos.forEach((photo) => {
            if (photo && photo.src) {
                html += `
                    <div style="text-align: center;">
                        <img src="${photo.src}" style="width: 100%; border: 1px solid #ccc; border-radius: 2px;">
                        <p style="font-size: 11px; margin-top: 5px; font-weight: bold; color: #01433B;">${photo.title}</p>
                    </div>
                `;
            }
        });

        html += `
                </div>
                <div style="margin-top: 40px;">
                    <div style="height: 12px; background: #01433B; width: 100%;"></div>
                    <div style="text-align: center; padding: 10px 0; font-size: 10px; font-weight: bold;">
                        <p style="margin: 2px 0;">INSTAGRAM: @PERSPECTIVA_PEC</p>
                        <p style="margin: 2px 0;">EMAIL: PERSPECTIVAPROJETOS@HOTMAIL.COM.BR</p>
                    </div>
                </div>
                <p style="text-align: right; font-size: 10px; font-weight: bold; margin-top: -25px; padding-right: 20px;">PAGINA 1/1</p>
            </div>
        `;
        content.innerHTML = html;
        modal.style.display = 'flex';
    }

    closeReportPreview() {
        document.getElementById('report-preview-modal').style.display = 'none';
    }

    async generateReportPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 15;

            // Use stored logo if available
            let logoBase64 = this.storedLogo;
            
            if (!logoBase64) {
                try {
                    // Try from file as fallback
                    logoBase64 = await this.getImageAsBase64('logo_cabecalho.jpg');
                } catch (e) {
                    console.error("Could not load local file logo:", e);
                }
            }

            let logoW = 0, logoH = 0, logoX = 0, logoY = 5;
            if (logoBase64) {
                try {
                    const imgProps = doc.getImageProperties(logoBase64);
                    const maxWidth = 75; 
                    const maxHeight = 30;
                    const ratio = imgProps.width / imgProps.height;
                    
                    logoW = maxWidth;
                    logoH = maxWidth / ratio;
                    
                    if (logoH > maxHeight) {
                        logoH = maxHeight;
                        logoW = maxHeight * ratio;
                    }
                    logoX = (pageWidth - logoW) / 2;
                } catch (e) { console.error('Logo prop error:', e); }
            }

            // Reference Y for content below logo
            const contentStartY = logoBase64 ? (logoY + logoH + 3) : 10;

            const workSelect = document.getElementById('report-work-select');
            const selectedWorkId = workSelect ? workSelect.value : '';
            const work = this.works.find(w => w.id == selectedWorkId) || {};

            const renderPageLayout = (pageNum, totalPages) => {
                if (logoBase64 && logoW > 0) {
                    try {
                        const imgProps = doc.getImageProperties(logoBase64);
                        doc.addImage(logoBase64, (imgProps.fileType || 'JPEG'), logoX, logoY, logoW, logoH);
                    } catch(e) { console.error('Logo addImage error:', e); }
                }

                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text("CNPJ: 19.737.981.0001-82 / CONTATO: (91) 98453-0611", pageWidth / 2, contentStartY + 1, { align: 'center' });
                doc.text("ENDERECO: RUA CORONEL RAIMUNDO LEAO N 1202 - BAIRRO CENTRO - CAMETA-PA", pageWidth / 2, contentStartY + 5, { align: 'center' });

                doc.setFillColor(1, 67, 59);
                doc.rect(0, contentStartY + 8, pageWidth, 4, 'F');

                doc.setFontSize(16);
                doc.setTextColor(1, 67, 59);
                doc.text("RELATORIO FOTOGRAFICO", pageWidth / 2, contentStartY + 20, { align: 'center' });

                // Work Details
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "bold");
                doc.text("Obra: ", margin, contentStartY + 30);
                doc.setFont("helvetica", "normal");
                doc.text(work.name || "-", margin + 12, contentStartY + 30);

                doc.setFont("helvetica", "bold");
                doc.text("Proprietário: ", margin, contentStartY + 35);
                doc.setFont("helvetica", "normal");
                doc.text(work.owner || "-", margin + 22, contentStartY + 35);

                doc.setFont("helvetica", "bold");
                doc.text("Telefone: ", margin + 100, contentStartY + 35);
                doc.setFont("helvetica", "normal");
                doc.text(work.phone || "-", margin + 117, contentStartY + 35);

                doc.setFont("helvetica", "bold");
                doc.text("Endereço: ", margin, contentStartY + 40);
                doc.setFont("helvetica", "normal");
                doc.text((work.address || "-") + (work.reference ? ` (Ref: ${work.reference})` : ""), margin + 18, contentStartY + 40);

                doc.setFont("helvetica", "normal");
                doc.text("Data: " + new Date().toLocaleDateString('pt-BR'), pageWidth - margin, contentStartY + 30, { align: 'right' });

                // Footer with 3cm border (30mm)
                const footerY = pageHeight - 30;
                doc.setFillColor(1, 67, 59);
                doc.rect(0, footerY, pageWidth, 4, 'F');

                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text("INSTAGRAM: @PERSPECTIVA_PEC", pageWidth / 2, footerY + 10, { align: 'center' });
                doc.text("EMAIL: PERSPECTIVAPROJETOS@HOTMAIL.COM.BR", pageWidth / 2, footerY + 14, { align: 'center' });
                doc.text("PAGINA " + pageNum + "/" + totalPages, pageWidth - margin, footerY + 12, { align: 'right' });
            };

            const photosPerPage = 6;
            const totalPages = Math.ceil(this.currentReportPhotos.length / photosPerPage) || 1;

            for (let i = 0; i < totalPages; i++) {
                if (i > 0) doc.addPage();
                const pageNum = i + 1;
                renderPageLayout(pageNum, totalPages);
                
                const startIdx = i * photosPerPage;
                const pagePhotos = this.currentReportPhotos.slice(startIdx, startIdx + photosPerPage);

                let startY = 82; // Adjusted for more work info
                const photoWidth = (pageWidth - (margin * 3)) / 2;
                const photoHeight = 50; // Slightly smaller to fit info

                pagePhotos.forEach((photo, idx) => {
                    if (photo && photo.src) {
                        const row = Math.floor(idx / 2);
                        const col = idx % 2;
                        const x = margin + (col * (photoWidth + margin));
                        const y = startY + (row * (photoHeight + 15));

                        try {
                            doc.addImage(photo.src, 'JPEG', x, y, photoWidth, photoHeight, undefined, 'FAST');
                            doc.setFontSize(9);
                            doc.setFont("helvetica", "bold");
                            doc.setTextColor(1, 67, 59);
                            doc.text(photo.title.toUpperCase(), x + (photoWidth/2), y + photoHeight + 5, { align: 'center' });
                        } catch (e) { console.error('PDF Img Error:', e); }
                    }
                });
            }

            doc.save("Relatorio_Obra_" + Date.now() + ".pdf");
            this.saveReportToHistory();
            this.closeReportPreview();
            alert("Relatorio gerado com sucesso!");
        } catch (err) {
            console.error(err);
            alert("Erro ao gerar PDF: " + err.message);
        }
    }

    saveReportToHistory() {
        const report = {
            id: Date.now(),
            date: new Date().toISOString(),
            photoCount: this.currentReportPhotos.length,
            title: "RELATORIO de " + this.currentReportPhotos.length + " fotos",
            photos: this.currentReportPhotos
        };
        this.reports.unshift(report);
        localStorage.setItem('obra_reports', JSON.stringify(this.reports));
    }

    renderReportHistory() {
        const list = document.getElementById('report-list');
        if (list) {
            list.innerHTML = '';
            if (this.reports.length === 0) {
                list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum RELATORIO encontrado.</p>';
                return;
            }
            this.reports.forEach(report => {
                const card = document.createElement('div');
                card.className = 'report-item-card';
                card.innerHTML = `
                    <h4>${report.title}</h4>
                    <div class="date">${new Date(report.date).toLocaleDateString('pt-BR')} ${new Date(report.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                        <button class="action-btn" onclick="app.reprintReport(${report.id})">
                            <i data-lucide="printer"></i> Reimprimir
                        </button>
                        <button class="action-btn" onclick="app.deleteReport(${report.id})" style="color: var(--danger)">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                `;
                list.appendChild(card);
            });
            lucide.createIcons();
        }
    }

    reprintReport(id) {
        const report = this.reports.find(r => r.id === id);
        if (report) {
            this.currentReportPhotos = report.photos;
            this.previewReport();
        }
    }

    deleteReport(id) {
        if (confirm('Deseja excluir este RELATORIO do histórico?')) {
            this.reports = this.reports.filter(r => r.id !== id);
            localStorage.setItem('obra_reports', JSON.stringify(this.reports));
            this.renderReportHistory();
        }
    }
}

const app = new MaterialApp();
