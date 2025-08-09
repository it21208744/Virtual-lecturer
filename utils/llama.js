const axios = require('axios')

const cleanText = (text) => {
  return text
    .replace(/[*#`_>]+/g, '') // remove markdown symbols
    .replace(/\\n/g, '\n') // convert literal "\n" to real newlines
    .replace(/\n{2,}/g, '\n') // collapse extra blank lines
    .replace(/\s+/g, ' ') // collapse spaces
    .trim()
}

const generateExplanation = async (
  pageText,
  style = 'detailed and easy to understand, like a lecturer',
  pageNumber = 1
) => {
  try {
    const introInstruction =
      pageNumber === 1
        ? 'Begin with a phrase like "Welcome to our presentation on evaluating the effectiveness of a tool" before continuing the explanation.'
        : 'Start the explanation immediately without any welcome phrase or introduction. Continue naturally as if the content is a direct continuation from the previous page. Do not use "phrases like It seems like, So you are working" '

    const response = await axios.post(
      process.env.LLAMA_API_URL,
      {
        model: process.env.LLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an expert lecturer. Explain the content clearly and in ${style} style. ${introInstruction} 
First, determine whether the provided text is from a lecture or from an assignment. 
If it is from a lecture PDF, explain it in a way that helps the audience understand the concepts clearly. 
If it is from an assignment, guide the reader step-by-step on how to approach and complete the assignment. 
Do not use markdown or special formatting like tables, bold (**), headings (##), or bullet points (- or *). Write only clean, plain text.`,
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

    return cleanText(response.data.choices[0].message.content)
  } catch (error) {
    console.error('Llama API Error:', error.response?.data || error.message)
    throw new Error('Failed to generate explanation')
  }
}

module.exports = generateExplanation
