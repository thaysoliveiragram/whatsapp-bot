const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.INSTANCE_NAME || "meubot";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const RESPOSTAS_FIXAS = {
  oi: "👋 Olá! Eu sou um assistente virtual.\n\nDigite *#menu* para ver o que posso fazer por você!",
  olá: "👋 Olá! Eu sou um assistente virtual.\n\nDigite *#menu* para ver o que posso fazer por você!",
  ola: "👋 Olá! Eu sou um assistente virtual.\n\nDigite *#menu* para ver o que posso fazer por você!",
  "#menu": "📋 *Menu de opções:*\n\n1️⃣ *#horario* - Horário de atendimento\n2️⃣ *#contato* - Falar com humano\n3️⃣ Qualquer pergunta - Respondo com IA 🤖",
  "#horario": "🕐 *Horário de atendimento humano:*\n\nSegunda a Sexta: 9h às 18h\nSábado: 9h às 13h",
  "#contato": "👤 *Falar com atendente humano:*\n\nDeixe sua mensagem e retornaremos em breve!\nOu ligue: (92) 99999-9999",
};

async function enviarMensagem(numero, texto) {
  try {
    await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
      { number: numero, text: texto },
      { headers: { apikey: EVOLUTION_API_KEY } }
    );
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err.response?.data || err.message);
  }
}

async function perguntarGroq(mensagem) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: content: "Você é um especialista em TI respondendo via WhatsApp para clientes da empresa TI Suporte GRAM. Responda apenas dúvidas relacionadas a tecnologia, computadores, redes, sistemas, softwares, hardware e suporte técnico. Se a pergunta não for sobre TI, diga educadamente que só pode ajudar com assuntos de tecnologia. Seja direto e objetivo, use no máximo 3 parágrafos curtos. Responda sempre em português brasileiro."
          },
          { role: "user", content: mensagem }
        ],
        max_tokens: 500,
      },
      {
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data.choices[0].message.content;
  } catch (err) {
    console.error("Erro ao chamar Groq:", err.response?.data || err.message);
    return "Desculpe, tive um problema ao processar sua mensagem. Tente novamente! 🙏";
  }
}

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.event !== "messages.upsert") return;
    const data = body.data;
    if (!data || data.key?.fromMe) return;
    const numero = data.key.remoteJid;
    const texto = data.message?.conversation || data.message?.extendedTextMessage?.text;
    if (!texto) return;
    console.log(`📩 Mensagem de ${numero}: ${texto}`);
    const textoNormalizado = texto.trim().toLowerCase();
    if (RESPOSTAS_FIXAS[textoNormalizado]) {
      await enviarMensagem(numero, RESPOSTAS_FIXAS[textoNormalizado]);
      return;
    }
    const resposta = await perguntarGroq(texto);
    await enviarMensagem(numero, resposta);
  } catch (err) {
    console.error("Erro no webhook:", err);
  }
});

app.get("/", (req, res) => res.json({ status: "ok", bot: "WhatsApp Bot rodando! 🤖" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot rodando na porta ${PORT}`));
