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
            'historico': 'Histórico de Solicitações'
        };
        const titleEl = document.getElementById('material-view-title');
        if (titleEl) titleEl.innerText = titleMap[mode] || 'Gestão de Materiais';

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
                <td data-label="Descrição">${item.desc}</td>
                <td data-label="Qtd">${item.qtd}</td>
                <td data-label="Unidade">${item.unid || '-'}</td>
                <td data-label="Obra">${item.obra_name || '-'}</td>
                <td data-label="Solicitante">${item.solicitante || '-'}</td>
                <td data-label="Valor" class="processor-info">R$ ${Number(item.valor || 0).toFixed(2)}</td>
                <td data-label="Status"><span class="status-badge status-${(item.status || 'solicitado').toLowerCase().replace(' ', '-')}">${item.status || 'Pedido solicitado'}</span></td>
                <td data-label="Processador" class="processor-info">${item.processador || '-'}</td>
                <td data-label="Processamento" class="processor-info">${this.formatDate(item.data_processamento)}</td>
                <td data-label="Entrega" class="processor-info">${this.formatDate(item.data_entrega)}</td>
                <td data-label="Ações">
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
            const obraName = work ? work.name : 'Obra não identificada';
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
                    alert('Por favor, preencha a descrição e a quantidade.');
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
                            <th>Descrição</th>
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
                <td data-label="Endereço">${work.address}</td>
                <td data-label="Referência">${work.reference || '-'}</td>
                <td data-label="Proprietário">${work.owner}</td>
                <td data-label="Telefone">${work.phone}</td>
                <td data-label="Ações">
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
            alert('Você precisa cadastrar uma obra antes de fazer um pedido!');
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
            if (modalTitle) modalTitle.innerText = 'Alterar Pedido Histórico';
            if (submitBtnText) submitBtnText.innerText = 'Salvar Alterações';

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
            if (submitBtnText) submitBtnText.innerText = data ? 'Salvar Alterações' : 'Finalizar Solicitação';
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
            const standardUnits = ['kg', 'sacos', 'm³', 'm²', 'unid', 'pacotes', 'milheiros'];
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
            slot.onclick = () => this.triggerPhotoUpload(i);
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

    triggerPhotoUpload(index) {
        const input = document.getElementById(`file-input-${index}`);
        if (input) input.click();
    }

    handlePhotoUpload(event, index) {
        const file = event.target.files[0];
        if (!file) return;

        const slot = document.getElementById(`photo-slot-${index}`);
        slot.classList.add('loading');

        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target.result;
            try {
                const standardizedData = await this.standardizeImage(imageData);

                // CRITICAL FIX: Direct update and specific slot re-render
                this.currentReportPhotos[index] = {
                    src: standardizedData,
                    title: this.getAISuggestion(index)
                };

                this.renderPhotoSlot(index);
                this.updateReportActions();
            } catch (err) {
                console.error('Erro ao processar imagem:', err);
                alert('Erro ao processar imagem. Tente outro arquivo.');
            } finally {
                slot.classList.remove('loading');
            }
        };
        reader.readAsDataURL(file);
    }

    standardizeImage(base64Str) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const targetWidth = 800;
                const targetHeight = 450; // 16:9
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
                resolve(canvas.toDataURL('image/jpeg', 0.4));
            };
            img.onerror = reject;
            img.src = base64Str;
        });
    }

    getAISuggestion(index) {
        const suggestions = [
            'Vista frontal da obra', 'Andamento da fundação', 'Instalações hidráulicas',
            'Revestimento interno', 'Estrutura metálica', 'Acabamento de reboco',
            'Pintura externa', 'Instalação elétrica', 'Colocação de pisos', 'Vista aérea geral'
        ];
        return suggestions[index % suggestions.length];
    }

    renderPhotoSlot(index) {
        const slot = document.getElementById(`photo-slot-${index}`);
        const photo = this.currentReportPhotos[index];
        if (!photo) return;

        // CRITICAL FIX: Keep the input but hide standard UI
        slot.innerHTML = `
            <img src="${photo.src}" alt="Foto ${index + 1}">
            <input type="text" class="photo-caption-input" 
                   value="${photo.title}" 
                   onchange="app.updatePhotoTitle(${index}, this.value)"
                   onclick="event.stopPropagation()">
            <input type="file" id="file-input-${index}" style="display:none" accept="image/*" onchange="app.handlePhotoUpload(event, ${index})">
        `;
    }

    updatePhotoTitle(index, title) {
        if (this.currentReportPhotos[index]) {
            this.currentReportPhotos[index].title = title;
        }
    }

    updateReportActions() {
        const uploadedCount = this.currentReportPhotos.filter(p => p !== null).length;
        const actions = document.querySelector('.report-actions');
        actions.style.display = uploadedCount === this.currentReportPhotos.length ? 'flex' : 'none';
    }

    previewReport() {
        const modal = document.getElementById('report-preview-modal');
        const content = document.getElementById('report-preview-content');

        const count = this.currentReportPhotos.length;

        let html = `
            <div style="text-align: center; border-bottom: 2px solid #005844; padding-bottom: 10px; margin-bottom: 10px;">
                <img src="logo.jpg" style="max-height: 40px;">
                <h1 style="font-size: 18px; color: #005844; margin: 5px 0;">RELATÓRIO FOTOGRÁFICO DE OBRA</h1>
                <p style="font-size: 11px; color: #666;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
            <div class="a4-photo-container">
        `;

        this.currentReportPhotos.forEach((photo) => {
            if (photo) {
                html += `
                    <div class="a4-photo-item">
                        <img src="${photo.src}">
                        <p>${photo.title.toUpperCase()}</p>
                    </div>
                `;
            }
        });

        html += '</div>';
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
            const availableWidth = pageWidth - (margin * 2);

            const getLogoBase64 = async () => {
                try {
                    const response = await fetch('logo.jpg');
                    const blob = await response.blob();
                    return new Promise(r => {
                        const reader = new FileReader();
                        reader.onloadend = () => r(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch { return null; }
            };

            const logoStr = await getLogoBase64();

            const renderPage = (photosSlice, isNewPage = false) => {
                if (isNewPage) doc.addPage();

                if (logoStr) doc.addImage(logoStr, 'JPEG', margin, margin, 35, 12);
                doc.setFontSize(14);
                doc.setTextColor(0, 88, 68);
                doc.text('RELATÓRIO FOTOGRÁFICO', pageWidth / 2, margin + 8, { align: 'center' });
                doc.setDrawColor(0, 88, 68);
                doc.line(margin, margin + 15, pageWidth - margin, margin + 15);

                const photoCount = photosSlice.length;
                const photoWidth = (availableWidth - 10) / 2;
                const photoHeight = (photoWidth * 9) / 16;
                const rowGap = 15;

                // Top Centered Layout (Starting below header)
                let startY = 40;

                photosSlice.forEach((photo, i) => {
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    const x = margin + (col * (photoWidth + 10));
                    const y = startY + (row * (photoHeight + rowGap));

                    if (photo && photo.src) {
                        try {
                            doc.addImage(photo.src, 'JPEG', x, y, photoWidth, photoHeight);
                        } catch (e) { console.error('PDF Img Error:', e); }
                    }
                    doc.setFontSize(9);
                    doc.setTextColor(50);
                    doc.text(photo.title.toUpperCase(), x + (photoWidth / 2), y + photoHeight + 5, { align: 'center' });
                });
            };

            for (let i = 0; i < this.currentReportPhotos.length; i += 6) {
                renderPage(this.currentReportPhotos.slice(i, i + 6), i > 0);
            }

            doc.save(`Relatorio_Obra_${Date.now()}.pdf`);
            this.saveReportToHistory();
            this.closeReportPreview();
            alert('Relatório gerado!');
        } catch (err) {
            console.error(err);
            alert('Erro ao gerar PDF: ' + err.message);
        }
    }

    saveReportToHistory() {
        const report = {
            id: Date.now(),
            date: new Date().toISOString(),
            photoCount: this.currentReportPhotos.length,
            title: `Relatório de ${this.currentReportPhotos.length} fotos`,
            photos: this.currentReportPhotos
        };
        this.reports.unshift(report);
        localStorage.setItem('obra_reports', JSON.stringify(this.reports));
    }

    renderReportHistory() {
        const list = document.getElementById('report-list');
        list.innerHTML = '';

        if (this.reports.length === 0) {
            list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Nenhum relatório encontrado.</p>';
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

    reprintReport(id) {
        const report = this.reports.find(r => r.id === id);
        if (report) {
            this.currentReportPhotos = report.photos;
            this.previewReport();
        }
    }

    deleteReport(id) {
        if (confirm('Deseja excluir este relatório do histórico?')) {
            this.reports = this.reports.filter(r => r.id !== id);
            localStorage.setItem('obra_reports', JSON.stringify(this.reports));
            this.renderReportHistory();
        }
    }
}

const app = new MaterialApp();
