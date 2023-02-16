import { ChatGPTAPI } from 'chatgpt'
const openai = new ChatGPTAPI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function (req, res) {
  if (req.body.token !== process.env.TOKEN) {
    res.status(401).json({
      code: 401,
      error: {
        message: 'token错误',
      }
    })
  }
  if (req.method !== 'POST') {
    res.status(400).json({
      code: 400,
      error: {
        message: '不支持的请求方式',
      }
    })
  }
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      code: 500,
      error: {
        message: 'OpenAI API key not configured, please follow instructions in README.md',
      }
    })
    return
  }

  const prompt = req.body.prompt || '';
  if (prompt.trim().length === 0) {
    res.status(400).json({
      code: 400,
      error: {
        message: '请输入问题',
      }
    });
    return
  }

  try {
    const completion = await openai.sendMessage(prompt)
    res.status(200).json({
      code: 200,
      result: completion.text
    })
  } catch (error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`)
      res.status(500).json({
        code: 500,
        error: {
          message: 'An error occurred during your request.',
        }
      });
    }
  }
}
