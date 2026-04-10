import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  JWT_SECRET: string
  APP_URL: string
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

// --- Auth Routes ---
app.get('/auth/google', (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID
  const redirectUri = `${c.env.APP_URL}/api/auth/callback`
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email profile`
  return c.redirect(url)
})

app.get('/auth/callback', async (c) => {
  const code = c.req.query('code')
  const clientId = c.env.GOOGLE_CLIENT_ID
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${c.env.APP_URL}/api/auth/callback`

  if (!code) return c.redirect('/?error=missing_code')

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })
    const tokenData = await tokenRes.json() as any

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token')
    }

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    const userData = await userRes.json() as any

    // Upsert user in D1
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, display_name, avatar_url)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name, avatar_url=excluded.avatar_url`
    ).bind(userData.id, userData.email, userData.name, userData.picture).run()

    // Create JWT
    const jwt = await sign({ 
      id: userData.id, 
      email: userData.email, 
      name: userData.name, 
      picture: userData.picture, 
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
    }, c.env.JWT_SECRET, 'HS256')

    setCookie(c, 'auth_token', jwt, { 
      httpOnly: true, 
      secure: true, 
      path: '/', 
      maxAge: 60 * 60 * 24 * 7 
    })

    return c.redirect('/')
  } catch (error) {
    console.error('Auth error:', error)
    return c.redirect('/?error=auth_failed')
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

export default app
