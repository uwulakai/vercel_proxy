const { GoogleGenerativeAI } = require("@google/generative-ai");

module.exports = async (req, res) => {
  try {
    // 1. Проверка внутреннего ключа
    const proxySecret = req.headers['x-proxy-secret'];
    if (proxySecret !== process.env.PROXY_SECRET) {
      return res.status(401).json({ error: "Invalid proxy secret" });
    }

    // 2. Извлечение ключа Gemini из тела запроса
    const { gemini_key, ...requestData } = req.body;
    if (!gemini_key) {
      return res.status(400).json({ error: "Gemini key is required" });
    }

    // 3. Инициализация Gemini с переданным ключом
    const genAI = new GoogleGenerativeAI(gemini_key);
    const model = genAI.getGenerativeModel({
      model: requestData.model || "gemini-1.5-flash"
    });

    // 4. Обработка запроса
    const convertedMessages = requestData.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: msg.content.map(part => {
        if (part.type === 'text') return { text: part.text };
        if (part.type === 'image_url') {
          const base64Data = part.image_url.url.split(',')[1];
          return {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          };
        }
      })
    }));

    const result = await model.generateContent({
      contents: convertedMessages
    });

    // 5. Возврат ответа
    res.json({
      choices: [{
        message: {
          role: "assistant",
          content: await result.response.text()
        }
      }]
    });

  } catch (error) {
    // Обработка ошибок Gemini
    const statusCode = error.message.includes('API_KEY') ? 403 : 500;
    res.status(statusCode).json({
      error: error.message
    });
  }
};