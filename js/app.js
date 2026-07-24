/**
 * ViaCEP Search Application Script
 * Supports Search by CEP and Reverse Search (CEP by Address)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Tab Elements
    const tabSearchCep = document.getElementById('tab-search-cep');
    const tabSearchAddress = document.getElementById('tab-search-address');
    
    // Forms
    const cepForm = document.getElementById('cep-form');
    const addressForm = document.getElementById('address-form');
    
    // CEP Form Controls
    const cepInput = document.getElementById('cep-input');
    const btnClear = document.getElementById('btn-clear');
    const btnSearch = document.getElementById('btn-search');
    const btnText = btnSearch.querySelector('.btn-text');
    const spinner = document.getElementById('spinner');

    // Address Form Controls
    const addrUf = document.getElementById('addr-uf');
    const addrCidade = document.getElementById('addr-cidade');
    const addrLogradouro = document.getElementById('addr-logradouro');
    const btnSearchAddr = document.getElementById('btn-search-addr');
    const btnTextAddr = btnSearchAddr.querySelector('.btn-text-addr');
    const spinnerAddr = document.getElementById('spinner-addr');
    
    // Common Messages & Loader
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const skeletonLoader = document.getElementById('skeleton-loader');
    
    // Single CEP Result Card Elements
    const resultCard = document.getElementById('result-card');
    const badgeUfCity = document.getElementById('badge-uf-city');
    const resLogradouroHeader = document.getElementById('res-logradouro');
    const resBairroCidadeHeader = document.getElementById('res-bairro-cidade');
    
    const resCep = document.getElementById('res-cep');
    const resLogradouroVal = document.getElementById('res-logradouro-val');
    const resBairro = document.getElementById('res-bairro');
    const resCidadeUf = document.getElementById('res-cidade-uf');
    const itemComplemento = document.getElementById('item-complemento');
    const resComplemento = document.getElementById('res-complemento');
    const resRegiaoEstado = document.getElementById('res-regiao-estado');
    const resDdd = document.getElementById('res-ddd');
    const resIbge = document.getElementById('res-ibge');
    
    const btnCopy = document.getElementById('btn-copy');
    const linkMap = document.getElementById('link-map');
    const mapIframe = document.getElementById('map-iframe');
    
    // Multiple Address Results Card Elements
    const addressResultsCard = document.getElementById('address-results-card');
    const addressResultsCount = document.getElementById('address-results-count');
    const addressResultsSubtitle = document.getElementById('address-results-subtitle');
    const addressResultsList = document.getElementById('address-results-list');

    // History Elements
    const historySection = document.getElementById('history-section');
    const historyChips = document.getElementById('history-chips');
    const btnClearHistory = document.getElementById('btn-clear-history');
    
    // Toast Element
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');

    // Local Storage Key
    const STORAGE_KEY = 'viacep_recent_searches';
    let currentAddressData = null;

    // Load initial history
    renderHistory();

    /* ==========================================================================
       Tab Navigation Logic
       ========================================================================== */

    tabSearchCep.addEventListener('click', () => {
        switchTab('cep');
    });

    tabSearchAddress.addEventListener('click', () => {
        switchTab('address');
    });

    function switchTab(mode) {
        hideError();
        resultCard.classList.add('hidden');
        addressResultsCard.classList.add('hidden');

        if (mode === 'cep') {
            tabSearchCep.classList.add('active');
            tabSearchAddress.classList.remove('active');
            cepForm.classList.remove('hidden');
            addressForm.classList.add('hidden');
            cepInput.focus();
        } else {
            tabSearchAddress.classList.add('active');
            tabSearchCep.classList.remove('active');
            addressForm.classList.remove('hidden');
            cepForm.classList.add('hidden');
            addrCidade.focus();
        }
    }

    /* ==========================================================================
       Input Mask & Event Listeners
       ========================================================================== */

    // Format CEP while typing (00000-000)
    cepInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Keep only numbers
        
        if (value.length > 8) {
            value = value.slice(0, 8);
        }

        if (value.length > 5) {
            value = `${value.slice(0, 5)}-${value.slice(5)}`;
        }

        e.target.value = value;

        if (value.length > 0) {
            btnClear.classList.remove('hidden');
        } else {
            btnClear.classList.add('hidden');
            hideError();
        }

        const cleanDigits = value.replace(/\D/g, '');
        if (cleanDigits.length === 8) {
            fetchAddressByCep(cleanDigits);
        }
    });

    // Clear CEP input
    btnClear.addEventListener('click', () => {
        cepInput.value = '';
        btnClear.classList.add('hidden');
        hideError();
        resultCard.classList.add('hidden');
        cepInput.focus();
    });

    // Submit CEP Form
    cepForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cleanCep = cepInput.value.replace(/\D/g, '');
        if (cleanCep.length !== 8) {
            showError('Por favor, digite um CEP válido com 8 dígitos.');
            return;
        }
        fetchAddressByCep(cleanCep);
    });

    // Submit Address Form (Reverse Search)
    addressForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const uf = addrUf.value.trim();
        const cidade = addrCidade.value.trim();
        const logradouro = addrLogradouro.value.trim();

        if (!uf) {
            showError('Por favor, selecione o Estado (UF).');
            return;
        }

        if (cidade.length < 3) {
            showError('A cidade deve conter pelo menos 3 caracteres.');
            return;
        }

        if (logradouro.length < 3) {
            showError('O logradouro deve conter pelo menos 3 caracteres.');
            return;
        }

        fetchCepByAddress(uf, cidade, logradouro);
    });

    // Copy Address Button
    btnCopy.addEventListener('click', () => {
        if (!currentAddressData) return;
        
        const fullAddress = `${currentAddressData.logradouro}${currentAddressData.complemento ? ', ' + currentAddressData.complemento : ''} - ${currentAddressData.bairro}, ${currentAddressData.localidade} - ${currentAddressData.uf}, CEP: ${currentAddressData.cep}`;
        
        navigator.clipboard.writeText(fullAddress).then(() => {
            showToast('Endereço copiado para a área de transferência!');
        }).catch(() => {
            showToast('Erro ao copiar endereço.');
        });
    });

    // Clear History
    btnClearHistory.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
        showToast('Histórico limpo.');
    });

    /* ==========================================================================
       ViaCEP Fetching Logic
       ========================================================================== */

    // 1. Fetch Address by CEP
    async function fetchAddressByCep(cleanCep) {
        hideError();
        showLoading(true);
        resultCard.classList.add('hidden');
        addressResultsCard.classList.add('hidden');

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            
            if (!response.ok) {
                throw new Error('Falha ao conectar à API do ViaCEP.');
            }

            const data = await response.json();

            if (data.erro) {
                showError('CEP não encontrado na base de dados.');
                return;
            }

            displaySingleResult(data);
            saveToHistory(data);

        } catch (error) {
            console.error('Erro na consulta:', error);
            showError('Não foi possível realizar a busca. Verifique sua conexão.');
        } finally {
            showLoading(false);
        }
    }

    // 2. Fetch CEP by Address (Reverse Search)
    async function fetchCepByAddress(uf, cidade, logradouro) {
        hideError();
        showLoading(true);
        resultCard.classList.add('hidden');
        addressResultsCard.classList.add('hidden');

        try {
            const url = `https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}/json/`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Falha ao conectar à API do ViaCEP.');
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                showError(`Nenhum CEP foi encontrado para "${logradouro}" em ${cidade}/${uf}. Tente resumir o nome da rua.`);
                return;
            }

            if (data.length === 1) {
                displaySingleResult(data[0]);
                saveToHistory(data[0]);
            } else {
                displayMultipleResults(data, cidade, uf);
            }

        } catch (error) {
            console.error('Erro na busca por endereço:', error);
            showError('Não foi possível realizar a busca. Verifique os dados e tente novamente.');
        } finally {
            showLoading(false);
        }
    }

    /* ==========================================================================
       UI Rendering Functions
       ========================================================================== */

    function displaySingleResult(data) {
        currentAddressData = data;

        const uf = data.uf || '';
        const cidade = data.localidade || '';
        const logradouro = data.logradouro || 'Sem logradouro específico';
        const bairro = data.bairro || 'Centro';
        const estado = data.estado || uf;
        const regiao = data.regiao || '';

        // Badge & Headers
        badgeUfCity.textContent = `${uf} · ${cidade}`;
        resLogradouroHeader.textContent = logradouro;
        resBairroCidadeHeader.textContent = `${bairro} — ${cidade} / ${uf}`;

        // Info Values
        resCep.textContent = data.cep || cepInput.value;
        resLogradouroVal.textContent = logradouro;
        resBairro.textContent = bairro;
        resCidadeUf.textContent = `${cidade} / ${uf}`;
        
        if (data.complemento && data.complemento.trim() !== '') {
            resComplemento.textContent = data.complemento;
            itemComplemento.classList.remove('hidden');
        } else {
            resComplemento.textContent = '-';
        }

        resRegiaoEstado.textContent = regiao ? `${regiao} (${estado})` : estado;
        resDdd.textContent = data.ddd ? `(${data.ddd})` : '-';
        resIbge.textContent = data.ibge || '-';

        // Google Maps Link & Iframe Embed
        const searchQuery = encodeURIComponent(`${logradouro}, ${bairro}, ${cidade} - ${uf}, Brasil`);
        linkMap.href = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
        mapIframe.src = `https://maps.google.com/maps?q=${searchQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

        // Show result card
        addressResultsCard.classList.add('hidden');
        resultCard.classList.remove('hidden');

        // Smooth scroll to results
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function displayMultipleResults(list, cidade, uf) {
        addressResultsCount.textContent = `${list.length} CEPs encontrados`;
        addressResultsSubtitle.textContent = `Resultados em ${cidade} / ${uf}. Clique para ver o mapa e detalhes.`;
        addressResultsList.innerHTML = '';

        list.forEach(item => {
            const card = document.createElement('div');
            card.className = 'address-item-card';
            card.innerHTML = `
                <div class="addr-card-info">
                    <span class="addr-card-cep">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        ${item.cep}
                    </span>
                    <span class="addr-card-street">${item.logradouro || 'Sem logradouro'} ${item.complemento ? ' (' + item.complemento + ')' : ''}</span>
                    <span class="addr-card-sub">${item.bairro} · ${item.localidade} / ${item.uf}</span>
                </div>
                <div class="addr-card-action">
                    <span>Ver Detalhes</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </div>
            `;

            card.addEventListener('click', () => {
                displaySingleResult(item);
                saveToHistory(item);
            });

            addressResultsList.appendChild(card);
        });

        resultCard.classList.add('hidden');
        addressResultsCard.classList.remove('hidden');

        // Smooth scroll
        addressResultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function showLoading(isLoading) {
        if (isLoading) {
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
            btnSearch.disabled = true;

            btnTextAddr.classList.add('hidden');
            spinnerAddr.classList.remove('hidden');
            btnSearchAddr.disabled = true;

            skeletonLoader.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            btnSearch.disabled = false;

            btnTextAddr.classList.remove('hidden');
            spinnerAddr.classList.add('hidden');
            btnSearchAddr.disabled = false;

            skeletonLoader.classList.add('hidden');
        }
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        resultCard.classList.add('hidden');
        addressResultsCard.classList.add('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function showToast(msg) {
        toastText.textContent = msg;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    /* ==========================================================================
       History Management
       ========================================================================== */

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveToHistory(data) {
        let history = getHistory();
        
        history = history.filter(item => item.cep !== data.cep);
        
        history.unshift({
            cep: data.cep,
            logradouro: data.logradouro || data.localidade,
            cidadeUf: `${data.localidade}/${data.uf}`
        });

        if (history.length > 6) {
            history = history.slice(0, 6);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        const history = getHistory();

        if (history.length === 0) {
            historySection.classList.add('hidden');
            return;
        }

        historySection.classList.remove('hidden');
        historyChips.innerHTML = '';

        history.forEach(item => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'chip';
            chip.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span><strong>${item.cep}</strong> (${item.cidadeUf})</span>
            `;
            chip.addEventListener('click', () => {
                switchTab('cep');
                cepInput.value = item.cep;
                btnClear.classList.remove('hidden');
                fetchAddressByCep(item.cep.replace(/\D/g, ''));
            });
            historyChips.appendChild(chip);
        });
    }
});
