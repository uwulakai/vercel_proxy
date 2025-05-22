# Vercel Gemini Proxy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fvercel-proxy)

Прокси-сервер для работы с Google Gemini API через OpenAI-совместимый интерфейс. Разработан для легкой интеграции с любыми системами и простого доступа даже за пределами поддерживаемых Google регионов, так как весь трафик идет через Vercel Edge Network.

## Предварительные требования
- Аккаунт на [Vercel](https://vercel.com)
- API ключ Google Gemini из [AI Studio](https://aistudio.google.com/)

## Пример использования (curl):

```curl -X POST "https://your-proxy.vercel.app/v1/chat/completions" \
  -H "X-Proxy-Secret: your_super_secret_123" \
  -H "Content-Type: application/json" \
  -d '{
    "gemini_key": "your_gemini_key",
    "messages": [
      {
        "role": "user", 
        "content": [
          {"type": "text", "text": "Распознай текст на изображении"},
          {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
        ]
      }
    ]
  }'