import express from 'express'
import cookieParser from 'cookie-parser'

import blocked from './blocked.js'
import { createToken, verifyChallenge, validateToken, decreaseRateLimit } from './library.js'
import proxy from './proxy.js'
import challenge from './challenge.js'

const app = express()

app.use(cookieParser())

app.use(express.json())

// Block self-identified AIs

app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] ?? ''
  const aiUserAgents: string[] = process.env.BLOCKED_BOTS ? JSON.parse(process.env.BLOCKED_BOTS) : [
    // OpenAI

    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',

    // Anthropic

    'anthropic-ai',
    'ClaudeBot',
    'Claude-SearchBot',

    // Google

    'Google-Extended',
    'Google-CloudVertexBot',

    // SpaceXAI

    'GrokBot',
    'xAI-Grok',
    'Grok-DeepSearch',

    // Other

    'PerplexityBot',
    'meta-externalagent',
    'Applebot-Extended',
    'CCBot',
    'Bytespider',
    'Amazonbot'
  ]

  if (aiUserAgents.some(agent => userAgent.includes(agent)) || Boolean(req.headers['ai-status'])) {
    blocked(req, res) // Block AI user agents

    return
  }

  next()
})

// Endpoints

app.get('/.well-known/aluminium-status', (req, res) => res.send('okay'))

app.get('/.well-known/aluminium-create-token', async (req, res) => {
  const userAgent = req.headers['user-agent'] ?? ''
  const ip = req.ip ?? req.socket.remoteAddress ?? ''

  const token = await createToken(userAgent, ip)

  if (token === false) {
    res.status(429).send({ error: 'Too many requests' })

    return
  }

  res.json(token)
})

app.post('/.well-known/aluminium-verify-token', async (req, res) => {
  const userAgent = req.headers['user-agent'] ?? ''

  const challengeSeed = req.body?.challengeSeed

  const nonce = req.body?.nonce

  const result = await verifyChallenge(userAgent, challengeSeed, nonce)

  if (result === null) {
    res.status(404).send({ error: 'Not found' })

    return
  }

  if (result === false) {
    res.status(400).send({ error: 'Bad request' })

    return
  }

  // Add a cookie

  res.cookie('aluminium-token', result, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.MODE === 'production',
    path: '/'
  })

  res.json({ error: 'None' })
})

// Allow static files and well-known paths to be accessed without a token

app.get(process.env.ALLOWED_PATHS ? JSON.parse(process.env.ALLOWED_PATHS) : [
  /^\/\.well-known(?:\/.*)?$/,   // Matches /.well-known and all sub-paths
  /^\/favicon\.ico$/,            // Matches exactly /favicon.ico
  /^\/manifest\.json(?:\?.*)?$/, // Matches manifest with optional query params
  /^\/[^\/]+\.txt$/,             // Matches any root-level text file (e.g., robots.txt)
  /^.*\.(xml|rss|atom)$/         // Matches any file ending in xml, rss, or atom feeds
], (req, res, next) => {
  return proxy(req, res, next)
})

// Allow if a token is present

app.use(async (req, res, next) => {
  const token = await validateToken(req.headers['user-agent'] ?? '', req.cookies['aluminium-token'])

  if (token) {
    // Decrease rate limit

    await decreaseRateLimit(token.token)

    // Proxy directly

    return proxy(req, res, next)
  } else {
    // If no token is present, show a challenge

    challenge(req, res)

    return
  }
})

// Start the server

const bind = process.env.BIND ? process.env.BIND : '0.0.0.0'
const port = process.env.PORT ? Number(process.env.PORT) : 3000

app.listen(port, bind, () => {
  console.log(`Server is running on port ${port}`)
})