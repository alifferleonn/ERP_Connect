import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { messages, provider, hostUrl, modelName, apiKey } = await req.json()

    if (provider === 'gemini') {
      const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
      const model = modelName || 'gemini-1.5-flash'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

      // Format messages history to match Gemini's structure (role 'user' or 'model')
      const geminiContents = messages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))

      const systemMsg = messages.find((m: any) => m.role === 'system')
      const systemInstruction = systemMsg 
        ? { parts: [{ text: systemMsg.content }] }
        : undefined

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': geminiKey
        },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: systemInstruction
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Erro na API do Gemini: ${errText || response.statusText}`)
      }

      const data = await response.json()
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.'
      return NextResponse.json({ message: reply })

    } else {
      // Ollama Provider
      const ollamaUrl = `${hostUrl || 'http://127.0.0.1:11434'}/api/chat`

      const response = await fetch(ollamaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName || 'llama3',
          messages: messages,
          stream: false,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Erro na resposta do Ollama: ${errText || response.statusText}`)
      }

      const data = await response.json()
      return NextResponse.json({
        message: data.message?.content || 'Sem resposta.'
      })
    }
  } catch (err: any) {
    console.error('AI Assistant API route error:', err)
    return NextResponse.json(
      { error: `Falha ao processar requisição de IA: ${err.message}` },
      { status: 500 }
    )
  }
}
