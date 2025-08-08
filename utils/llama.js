const axios = require('axios')

const generateExplanation = async (
  pageText,
  style = 'detailed and easy to understand, like a lecturer'
) => {
  try {
    const response = await axios.post(
      process.env.LLAMA_API_URL,
      {
        model: process.env.LLAMA_MODEL, // e.g., "llama3-70b"
        messages: [
          {
            role: 'system',
            content: `You are an expert lecturer. Explain the content clearly and in ${style} style.`,
          },
          { role: 'user', content: pageText },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LLAMA_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data.choices[0].message.content.trim()
  } catch (error) {
    console.error('Llama API Error:', error.response?.data || error.message)
    throw new Error('Failed to generate explanation')
  }
}

module.exports = generateExplanation
