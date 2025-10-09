// ================================================
// 1. IMPORTAÇÕES
// ================================================
import express from 'express';
import 'dotenv/config'; // Carrega as variáveis do .env no início
import { GoogleGenerativeAI } from '@google/generative-ai';


// ================================================
// 2. CONFIGURAÇÃO E INICIALIZAÇÃO
// ================================================
const app = express();
const PORT = 3000;

// Inicializa o cliente do Gemini com a chave da API do .env
// Garanta que o arquivo .env existe e tem a GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// ================================================
// 3. ENDPOINTS DA API
// ================================================

// Endpoint Raiz - Documenta a API
app.get('/', (req, res) => {
    res.json({
        message: "API multifuncional está rodando!",
        endpoints: {
            conversao: "/convert?from=cm&to=inch&value=10",
            jogo_ia: "/jogo/famosos-da-ia"
        }
    });
});

// Endpoint de conversão genérico
app.get('/convert', (req, res) => {
    const { from, to, value } = req.query;

    if (!from || !to || !value) {
        return res.status(400).json({ erro: "Parâmetros 'from', 'to', e 'value' são obrigatórios." });
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
        return res.status(400).json({ erro: "O parâmetro 'value' deve ser um número válido." });
    }

    let result;
    if (from === 'cm' && to === 'inch') {
        result = numericValue / 2.54;
    } else if (from === 'inch' && to === 'cm') {
        result = numericValue * 2.54;
    } else {
        return res.status(400).json({ erro: `A conversão de '${from}' para '${to}' não é suportada.` });
    }

    res.json({
        unidade_de_origem: from,
        unidade_de_destino: to,
        valor_de_entrada: numericValue,
        resultado: parseFloat(result.toFixed(2))
    });
});

// Endpoint que consulta o Gemini em tempo real
app.get('/jogo/famosos-da-ia', async (req, res) => {
    try {
        console.log("Recebida requisição para /jogo/famosos-da-ia. Consultando a IA do Gemini...");
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
            Me retorne um JSON válido, e nada mais, contendo um array com dois objetos.
            Cada objeto deve representar uma pessoa viva de fama internacional e ter as chaves "nome", "anoNascimento" e "principaisConquistas".
            As conquistas devem ser um array de strings não maior que 3.
            Não inclua explicações ou texto antes ou depois, apenas o JSON puro.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        console.log("Resposta recebida da IA:", text);

        // Extrai o primeiro JSON válido do texto retornado
        const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("A resposta da IA não contém um JSON válido.");
        }
        const famososDoJson = JSON.parse(jsonMatch[0]);

        const calcularIdade = (anoNascimento) => new Date().getFullYear() - anoNascimento;
        
        const resultadoFinal = famososDoJson.map(famoso => ({
            nome: famoso.nome,
            idade: calcularIdade(famoso.anoNascimento)
        }));

        res.json(resultadoFinal);
    } catch (error) {
        console.error("Erro ao consultar a API do Gemini:", error);
        res.status(500).json({ erro: "Falha ao obter dados da IA." });
    }
});

// Adicione este endpoint de diagnóstico ao seu index.js

app.get('/diagnostico/verificar-modelo', async (req, res) => {
    // Pegue o nome do modelo a ser testado da URL, ex: ?modelo=gemini-pro
    const nomeDoModelo = req.query.modelo;

    if (!nomeDoModelo) {
        return res.status(400).json({ erro: "Forneça um nome de modelo na query string, ex: ?modelo=gemini-pro" });
    }

    try {
        console.log(`Testando o modelo: ${nomeDoModelo}...`);
        
        // Tenta obter o modelo
        const model = genAI.getGenerativeModel({ model: nomeDoModelo });
        
        // Tenta fazer uma chamada muito simples para ver se ele suporta generateContent
        await model.generateContent("Olá");

        // Se chegou até aqui, o modelo existe e funciona!
        res.json({
            modelo: nomeDoModelo,
            status: "Disponível e funcionando!"
        });

    } catch (error) {
        console.error(`Erro ao testar o modelo ${nomeDoModelo}:`, error.message);
        // Retorna o erro exato da API para nos ajudar a depurar
        res.status(500).json({
            modelo: nomeDoModelo,
            status: "ERRO",
            mensagem_original: error.message 
        });
    }
});


// ================================================
// 4. INICIALIZAÇÃO DO SERVIDOR
// ================================================
app.listen(PORT, () => {
    console.log(`🚀 API rodando em http://localhost:${PORT}`);
    console.log(`✅ Ambiente: DENTRO do Dev Container`);
});