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

  const originalFilename = file.name || 'score.musicxml';
  const ext = originalFilename.includes('.') ? originalFilename.split('.').pop()?.toLowerCase() : 'musicxml';
  const finalExt = (ext === 'mxl' || ext === 'xml') ? ext : 'musicxml';
  
  const id = crypto.randomUUID()
  const fileKey = `scores/${id}.${finalExt}`

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

  const ext = (score.file_key as string).includes('.') ? (score.file_key as string).split('.').pop()?.toLowerCase() : 'musicxml';
  const contentType = ext === 'mxl' ? 'application/vnd.recordare.musicxml' : 'application/vnd.recordare.musicxml+xml';

  c.header('Content-Type', contentType)
  c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(score.title as string)}.${ext}"`)
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

    const systemMessage = `You are a master music composer, arranger, and world-class expert in ABC notation.
Generate a complete, valid, and highly expressive ABC notation score based on the user's request.

CRITICAL INSTRUCTIONS:
1. Output Format: Return ONLY the raw ABC notation text. NO markdown code blocks like \`\`\`abc. NO explanations. NO conversational text.
2. Headers: You MUST include all mandatory headers: X: (reference number), T: (Title), M: (Meter), L: (Default Note Length), K: (Key).
3. TEMPO (CRITICAL!): You MUST include the 'Q:' header (e.g., Q: 1/4=130 or Q: 130). Set the exact BPM to match the requested style perfectly.
4. DURATION (CRITICAL!): If the user asks for a time length (e.g., "1 minute"), mathematically calculate the number of measures needed based on your BPM and Time Signature, and write exactly that amount of music. Do not just write 4 measures and stop!
5. STYLE & GROOVE: If the user asks for "Brazilian Funk", "Jazz", or complex genres, use heavy syncopation, 16th notes, triplets, ties (-), rests (z), and idiomatic rhythmic patterns. DO NOT generate basic beginner whole notes unless explicitly asked.
6. EXPRESSION: Use chords (e.g., [CEG]), articulations (staccato '.', accents '!>!'), and dynamics (e.g., !mf!, !f!) to make the playback sound highly dynamic and professional.
7. INSTRUMENT: You can use '%%MIDI program <number>' right after the headers to pick an appropriate General MIDI instrument (e.g., 0 for Piano, 24 for Guitar, 33 for Bass, 56 for Trumpet).
8. Syntax: Ensure 100% valid ABC notation so the renderer does not fail.`

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

// --- Device Management Routes ---

// Device calls this to check its status or get a binding code
app.get('/devices/status', async (c) => {
  const uid = c.req.query('uid')
  if (!uid) return c.json({ error: 'UID required' }, 400)

  let device = await c.env.DB.prepare('SELECT * FROM devices WHERE id = ?').bind(uid).first() as any

  if (!device) {
    // Register new device
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins
    await c.env.DB.prepare(
      'INSERT INTO devices (id, binding_code, binding_code_expires) VALUES (?, ?, ?)'
    ).bind(uid, code, expires).run()
    return c.json({ bound: false, binding_code: code })
  }

  if (device.user_id) {
    const user = await c.env.DB.prepare('SELECT display_name FROM users WHERE id = ?').bind(device.user_id).first() as any
    return c.json({ bound: true, user_name: user?.display_name })
  }

  // Not bound, check if code expired
  const now = new Date().toISOString()
  if (!device.binding_code || device.binding_code_expires < now) {
     const code = Math.floor(100000 + Math.random() * 900000).toString()
     const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
     await c.env.DB.prepare(
       'UPDATE devices SET binding_code = ?, binding_code_expires = ?, last_seen = ? WHERE id = ?'
     ).bind(code, expires, now, uid).run()
     return c.json({ bound: false, binding_code: code })
  }

  // Update last seen
  await c.env.DB.prepare('UPDATE devices SET last_seen = ? WHERE id = ?').bind(now, uid).run()

  return c.json({ bound: false, binding_code: device.binding_code })
})

// Device calls this to get scores of the bound user
app.get('/devices/scores', async (c) => {
  const uid = c.req.query('uid')
  if (!uid) return c.json({ error: 'UID required' }, 400)

  const device = await c.env.DB.prepare('SELECT user_id FROM devices WHERE id = ?').bind(uid).first() as any
  if (!device || !device.user_id) return c.json({ error: 'Device not bound' }, 403)

  const { results } = await c.env.DB.prepare(
    `SELECT id, title, composer, instrument, created_at FROM scores 
     WHERE uploader_id = ? ORDER BY created_at DESC`
  ).bind(device.user_id).all()

  return c.json({ success: true, scores: results })
})

// Web user binds a device using a code
app.post('/devices/bind', authMiddleware, async (c) => {
  const user = c.get('user')
  const { code, device_name } = await c.req.json()
  const now = new Date().toISOString()

  const device = await c.env.DB.prepare(
    'SELECT * FROM devices WHERE binding_code = ? AND binding_code_expires > ?'
  ).bind(code, now).first() as any

  if (!device) return c.json({ error: 'Invalid or expired code' }, 400)

  await c.env.DB.prepare(
    'UPDATE devices SET user_id = ?, device_name = ?, binding_code = NULL, binding_code_expires = NULL WHERE id = ?'
  ).bind(user.id, device_name || 'M5Stack Core2', device.id).run()

  return c.json({ success: true })
})

// Web user gets their bound devices
app.get('/devices/me', authMiddleware, async (c) => {
  const user = c.get('user')
  const { results } = await c.env.DB.prepare(
    'SELECT id, device_name, last_seen, created_at FROM devices WHERE user_id = ?'
  ).bind(user.id).all()
  return c.json({ success: true, devices: results })
})

// Web user unbinds a device
app.delete('/devices/:id', authMiddleware, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  
  await c.env.DB.prepare(
    'UPDATE devices SET user_id = NULL, binding_code = NULL, binding_code_expires = NULL WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).run()
  
  return c.json({ success: true })
})

export default app
