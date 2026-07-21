import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { messages, hostUrl, modelName } = await req.json()

    const ollamaUrl = `${hostUrl || 'http://127.0.0.1:11434'}/api/chat`

    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName || 'llama3',
        messages: messages,
        stream: false, // keep it simple and clean
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
  } catch (err: any) {
    console.error('Ollama API proxy error:', err)
    return NextResponse.json(
      { error: `Falha ao conectar com o Ollama: ${err.message || 'Servidor offline'}` },
      { status: 500 }
    )
  }
}
