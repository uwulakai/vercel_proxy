const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const mime = require("mime-types");

module.exports = async (req, res) => {
  try {
    // 1. Проверка внутреннего ключа
    const proxySecret = req.headers['x-proxy-secret'];
    if (!proxySecret || proxySecret !== process.env.PROXY_SECRET) {
      return res.status(401).json({ error: "Invalid proxy secret" });
    }

    // 2. Проверка тела запроса
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { gemini_key, model, messages } = req.body;

    // 3. Валидация обязательных полей
    if (!gemini_key) {
      return res.status(400).json({ error: "Missing gemini_key" });
    }
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    // 4. Инициализация Gemini
    const genAI = new GoogleGenerativeAI(gemini_key);
    const genModel = genAI.getGenerativeModel({
      model: model || "gemini-1.5-flash"
    });

    // 5. Конвертация сообщений с поддержкой URL
    const convertedMessages = await Promise.all(messages.map(async (msg) => {
      const parts = await Promise.all((msg.content || []).map(async (part) => {
        if (part.type === 'text') {
          return { text: part.text || "" };
        }
        
        if (part.type === 'image_url') {
          const imageUrl = part.image_url?.url || "";
          
          // Если это base64
          if (imageUrl.startsWith('data:')) {
            const base64Data = imageUrl.split(',')[1] || "";
            return {
              inlineData: {
                mimeType: imageUrl.split(';')[0].split(':')[1] || "image/jpeg",
                data: base64Data
              }
            };
          }
          
          // Если это URL
          try {
            const response = await axios.get(imageUrl, {
              responseType: 'arraybuffer'
            });
            
            const mimeType = response.headers['content-type'] || mime.lookup(imageUrl) || "image/jpeg";
            const base64Data = Buffer.from(response.data, 'binary').toString('base64');
            
            return {
              inlineData: {
                mimeType,
                data: base64Data
              }
            };
          } catch (error) {
            console.error(`Error fetching image from URL: ${imageUrl}`, error);
            return { text: `[Image load error: ${imageUrl}]` };
          }
        }
        
        return { text: "" };
      }));
      
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
      };
    }));

    // 6. Вызов API
    const result = await genModel.generateContent({
      contents: convertedMessages
    });

    // 7. Отправка ответа
    res.json({
      choices: [{
        message: {
          role: "assistant",
          content: (await result.response.text()) || ""
        }
      }]
    });

  } catch (error) {
    // Детальный лог ошибки
    console.error("Full error:", {
      message: error.message,
      stack: error.stack,
      body: req.body
    });

    // Классификация ошибок
    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.message.includes("API_KEY")) {
      statusCode = 403;
      errorMessage = "Invalid Gemini API key";
    } else if (error.message.includes("INVALID_ARGUMENT")) {
      statusCode = 400;
      errorMessage = "Invalid request format";
    } else if (error.message.includes("UNABLE_TO_FETCH_IMAGE")) {
      statusCode = 400;
      errorMessage = "Could not fetch image from URL";
    }

    res.status(statusCode).json({ error: errorMessage });
  }
};