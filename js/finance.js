/**
 * Finance Core Logic
 * Handles BCB API fetching and all investment calculations
 */

const Finance = (() => {
    // Default fallback values in case APIs fail
    let currentCDI = 10.4; // % a.a
    let currentIPCA = 4.5; // % nos ultimos 12 meses

    // BCB API Endpoints
    // 432 = Taxa Selic Meta
    // 13522 = IPCA (variação acumulada em 12 meses)
    const API_SELIC = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json';
    const API_IPCA = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json';

    async function fetchMarketData() {
        try {
            const [selicRes, ipcaRes] = await Promise.all([
                fetch(API_SELIC),
                fetch(API_IPCA)
            ]);

            const selicData = await selicRes.json();
            const ipcaData = await ipcaRes.json();

            if (selicData && selicData.length > 0) {
                // CDI is historically Selic Meta - 0.1%
                currentCDI = Math.max(0, parseFloat(selicData[0].valor) - 0.1);
            }

            if (ipcaData && ipcaData.length > 0) {
                currentIPCA = parseFloat(ipcaData[0].valor);
            }
            
            return { cdi: currentCDI, ipca: currentIPCA, success: true };
        } catch (error) {
            console.error('Error fetching BCB APIs, using fallback values:', error);
            return { cdi: currentCDI, ipca: currentIPCA, success: false };
        }
    }

    function getMarketRates() {
        return { cdi: currentCDI, ipca: currentIPCA };
    }

    /**
     * Obter a aliquota de IR com base na Tabela Regressiva
     * @param {number} days Tempo do investimento em dias
     * @returns {number} Porcentagem do IR (ex: 0.15 para 15%)
     */
    function getRegressiveIR(days) {
        if (days <= 180) return 0.225;
        if (days <= 360) return 0.20;
        if (days <= 720) return 0.175;
        return 0.15;
    }

    /**
     * Calcula o retorno da Poupança (Regra simplificada)
     * Se Selic Meta > 8.5%, poupança rende 0.5% a.m + TR (aprox 6.17% a.a + TR).
     * Se Selic Meta <= 8.5%, poupança rende 70% da Selic + TR.
     * Nós aproximaremos ignorando a TR para ser mais conservador, ou somando um valor baixo de TR.
     * Para fins educacionais simples:
     */
    function calculatePoupancaRate() {
        const selic = currentCDI + 0.1;
        if (selic > 8.5) {
            return 6.17; // Aprox 0.5% a.m ao ano
        } else {
            return selic * 0.7;
        }
    }

    /**
     * Realiza o cálculo do investimento
     * @param {Object} params
     * @param {string} params.type 'cdb', 'lci_lca', 'tesouro_selic', etc
     * @param {number} params.amount Valor investido
     * @param {number} params.time Prazo
     * @param {string} params.timeUnit 'months' ou 'years'
     * @param {string} params.rateType 'post_cdi', 'pre_fixed', 'ipca_plus'
     * @param {number} params.rateValue Valor da taxa prometida
     */
    function calculateInvestment(params) {
        const { type, amount, time, timeUnit, rateType, rateValue } = params;

        // Converter tempo para dias (simplificado comercialmente) e anos
        const timeInYears = timeUnit === 'years' ? time : time / 12;
        const timeInDays = timeInYears * 365;

        // 1. Encontrar a Taxa de Rendimento Anual (Gross Rate)
        let annualRate = 0; // Porcentagem normal ex: 10 para 10%
        
        switch(type) {
            case 'poupanca':
                annualRate = calculatePoupancaRate();
                break;
            default:
                if (rateType === 'post_cdi') {
                    // taxa da % do CDI. Ex: 110% do CDI -> 1.1 * CDI
                    annualRate = (rateValue / 100) * currentCDI;
                } else if (rateType === 'pre_fixed') {
                    annualRate = rateValue;
                } else if (rateType === 'ipca_plus') {
                    annualRate = currentIPCA + rateValue;
                }
                break;
        }

        // 2. Cálculo do Retorno Bruto (Juros Compostos)
        // Montante = P * (1 + i)^n
        const rateDecimal = annualRate / 100;
        const grossAmount = amount * Math.pow(1 + rateDecimal, timeInYears);
        const grossProfit = grossAmount - amount;

        // 3. Cálculo do Imposto
        let taxes = 0;
        let taxDescription = '0% (Isento)';
        
        const isentos = ['lci_lca', 'poupanca'];
        if (!isentos.includes(type)) {
            // Regra de Fundo DI é come-cotas (15% a 20%), para o comparativo vamos usar regressivo basico pra simplificar de ações também. 
            // Na vida real, Tesouro e CDB seguem regressivo certinho.
            if (type === 'fundo_di') {
                 // Simplificando o come cotas para IR no resgate
                 const irAliquota = getRegressiveIR(timeInDays);
                 taxes = grossProfit * irAliquota;
                 taxDescription = `${(irAliquota*100).toFixed(1)}% (IR)`;
            } else {
                 const irAliquota = getRegressiveIR(timeInDays);
                 taxes = grossProfit * irAliquota;
                 taxDescription = `${(irAliquota*100).toFixed(1)}% (IR Regressivo)`;
            }
        }

        // 4. Valores Finais
        const netProfit = grossProfit - taxes;
        const netAmount = amount + netProfit;
        
        // 5. Retorno Real (Descontando IPCA pelo tempo)
        // (1 + Rentabilidade Liquida Acumulada) / (1 + Inflação Acumulada) - 1
        const netRateAccumulated = netProfit / amount;
        const inflacaoAccumulated = Math.pow(1 + (currentIPCA / 100), timeInYears) - 1;
        
        const realRateAccumulated = ((1 + netRateAccumulated) / (1 + inflacaoAccumulated)) - 1;
        const realProfit = amount * realRateAccumulated;

        return {
            amount,
            grossAmount,
            grossProfit,
            taxes,
            taxDescription,
            netAmount,
            netProfit,
            realProfit,
            annualRate,
            netRateAccumulated: netRateAccumulated * 100, // %
            realRateAccumulated: realRateAccumulated * 100 // %
        };
    }

    return {
        fetchMarketData,
        getMarketRates,
        calculateInvestment
    };
})();
