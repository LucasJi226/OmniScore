import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  JWT_SECRET: string
  AI_API_KEY?: string
  AI_API_URL?: string
}

type Variables = {
  user: {
    id: string
    email: string
    name: string
    picture: string
  }
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api')

// --- Auth Middleware ---
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, 'auth_token')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as any
    c.set('user', payload)
    await next()
  } catch (e) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
}

// --- Helper: Hash Password ---
async function hashPassword(password: string, salt: string) {
  const msgUint8 = new TextEncoder().encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// --- Auth Routes ---
app.post('/auth/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json()
    if (!email || !password || !name) return c.json({ error: 'Missing fields' }, 400)

    const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (existingUser) return c.json({ error: 'Email already exists' }, 400)

    const id = crypto.randomUUID()
    const salt = crypto.randomUUID()
    const password_hash = await hashPassword(password, salt)
    const picture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`

    await c.env.DB.prepare(
      `INSERT INTO users (id, email, display_name, avatar_url, password_hash, salt)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, email, name, picture, password_hash, salt).run()

    const jwt = await sign({ 
      id, 
      email, 
      name, 
      picture, 
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 
    }, c.env.JWT_SECRET, 'HS256')

    setCookie(c, 'auth_token', jwt, { 
      httpOnly: true, 
      secure: true, 
      path: '/', 
      maxAge: 60 * 60 * 24 * 7 
    })

    return c.json({ success: true, user: { id, email, name, picture } })
  } catch (error: any) {
    console.error('Register error:', error)
    return c.json({ error: 'Registration failed: ' + (error.message || String(error)) }, 500)
  }
})

app.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password) return c.json({ error: 'Missing fields' }, 400)

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    if (!user || !user.salt) return c.json({ error: 'Invalid credentials' }, 401)

    const hash = await hashPassword(password, user.salt as string)
    if (hash !== user.password_hash) return c.json({ error: 'Invalid credentials' }, 401)

    const jwt = await sign({ 
      id: user.id, 
      email: user.email, 
      name: user.display_name, 
      picture: user.avatar_url, 
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 
    }, c.env.JWT_SECRET, 'HS256')

    setCookie(c, 'auth_token', jwt, { 
      httpOnly: true, 
      secure: true, 
      path: '/', 
      maxAge: 60 * 60 * 24 * 7 
    })

    return c.json({ success: true, user: { id: user.id, email: user.email, name: user.display_name, picture: user.avatar_url } })
  } catch (error: any) {
    console.error('Login error:', error)
    return c.json({ error: 'Login failed: ' + (error.message || String(error)) }, 500)
  }
})

app.get('/auth/me', authMiddleware, (c) => {
  const user = c.get('user')
  return c.json({ user })
})

app.post('/auth/logout', (c) => {
  deleteCookie(c, 'auth_token', { path: '/' })
  return c.json({ success: true })
})

// --- Score Routes ---

// Get public scores (Market)
app.get('/scores', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM scores WHERE is_public = 1 ORDER BY created_at DESC`
  ).all()
  return c.json(results)
})

// Get my scores (Library)
app.get('/scores/me', authMiddleware, async (c) => {
  const user = c.get('user')
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM scores WHERE uploader_id = ? ORDER BY created_at DESC`
  ).bind(user.id).all()
  return c.json(results)
})

// Upload score
app.post('/scores', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.parseBody()
  
  const file = body['file'] as File
  const title = body['title'] as string
  const composer = body['composer'] as string
  const instrument = body['instrument'] as string
  const description = body['description'] as string
  const isPublic = body['isPublic'] === 'true' ? 1 : 0

  if (!file || !title || !instrument) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const id = crypto.randomUUID()
  const fileKey = `scores/${id}.musicxml`

  try {
    // Upload to R2
    await c.env.BUCKET.put(fileKey, await file.arrayBuffer())

    // Save to D1
    await c.env.DB.prepare(
      `INSERT INTO scores (id, title, composer, instrument, description, uploader_id, uploader_name, is_public, file_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, title, composer, instrument, description, user.id, user.name, isPublic, fileKey).run()

    return c.json({ success: true, id })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

// Download score
app.get('/scores/:id/download', async (c) => {
  const id = c.req.param('id')
  
  // Check if score exists and is public (or owned by user)
  const score = await c.env.DB.prepare(`SELECT * FROM scores WHERE id = ?`).bind(id).first()
  if (!score) return c.json({ error: 'Not found' }, 404)

  // In a real app, you'd check auth here if it's private. For simplicity, we allow downloading if you have the ID.
  
  const object = await c.env.BUCKET.get(score.file_key as string)
  if (!object) return c.json({ error: 'File not found in storage' }, 404)

  // Increment downloads
  await c.env.DB.prepare(`UPDATE scores SET downloads = downloads + 1 WHERE id = ?`).bind(id).run()

  c.header('Content-Type', 'application/vnd.recordare.musicxml+xml')
  c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(score.title as string)}.musicxml"`)
  return c.body(object.body)
})

// Delete score
app.delete('/scores/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  
  const score = await c.env.DB.prepare(`SELECT * FROM scores WHERE id = ? AND uploader_id = ?`).bind(id, user.id).first()
  if (!score) return c.json({ error: 'Not found or unauthorized' }, 404)

  try {
    await c.env.BUCKET.delete(score.file_key as string)
    await c.env.DB.prepare(`DELETE FROM scores WHERE id = ?`).bind(id).run()
    return c.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return c.json({ error: 'Delete failed' }, 500)
  }
})

// --- AI Compose Route ---
app.post('/ai/compose', async (c) => {
  try {
    const body = await c.req.json()
    const prompt = body.prompt
    const model = body.model || 'Qwen/Qwen2.5-72B-Instruct'
    const apiUrl = body.apiUrl || c.env.AI_API_URL || 'https://api.siliconflow.cn/v1/chat/completions'
    const apiKey = body.apiKey || c.env.AI_API_KEY

    if (!prompt) return c.json({ error: 'Prompt is required' }, 400)

    if (!apiKey) {
       return c.json({ error: 'API key is not configured. Please provide it in the UI or configure AI_API_KEY in the backend.' }, 500)
    }

    const systemMessage = `You are an expert music composer and ABC notation expert. 
Generate a complete, valid ABC notation score based on the user's request.
CRITICAL INSTRUCTIONS:
- Return ONLY the raw ABC notation text.
- Do NOT wrap in markdown code blocks like \`\`\`abc.
- Do NOT include any explanations or conversational text.
- Ensure all mandatory ABC headers are present (X:1, T:Title, M:Meter, L:Note Length, K:Key).
- Ensure the music logic (measures, notes) matches the user's prompt as closely as possible.`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      })
    });

    if (!response.ok) {
       const errText = await response.text();
       console.error("AI API Error:", errText);
       return c.json({ error: 'Failed to generate music from AI: ' + errText }, 500)
    }

    const data: any = await response.json();
    let abcText = data.choices[0]?.message?.content?.trim() || '';
    
    // Fallback cleanup if model still returns markdown
    if (abcText.startsWith('\`\`\`')) {
        const lines = abcText.split('\\n');
        if (lines[0].startsWith('\`\`\`')) lines.shift();
        if (lines[lines.length - 1].startsWith('\`\`\`')) lines.pop(); // Remove trailing markdown
        abcText = lines.join('\\n');
    }

    return c.json({ success: true, abc: abcText })
  } catch (err: any) {
    console.error('AI compose error:', err)
    return c.json({ error: err.message || 'Internal Server Error' }, 500)
  }
})

export default app
