import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const geminiKey = process.env.GEMINI_API_KEY
    
    // Dynamically load the model name from the environment variable
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

    if (!geminiKey) {
      return NextResponse.json(
        { error: 'Chave de API do Gemini não configurada no servidor (.env / GEMINI_API_KEY).' },
        { status: 400 }
      )
    }

    // Automatically select the correct API version depending on the model chosen
    const apiVersion = model.startsWith('gemini-2.0') ? 'v1beta' : 'v1'
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${geminiKey}`

    // Format chat history to Gemini's expected structure (role 'user' or 'model')
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
        'Content-Type': 'application/json'
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

  } catch (err: any) {
    console.error('AI Assistant API route error:', err)
    return NextResponse.json(
      { error: `Falha ao processar requisição de IA: ${err.message}` },
      { status: 500 }
    )
  }
}
