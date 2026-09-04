import { createProxyMiddleware } from 'http-proxy-middleware'

const target = process.env.TARGET

// Throw error if the TARGET environment variable is not set

if (!target) {
  throw new Error('TARGET environment variable is required')
}

// Create a proxy middleware to forward requests to the target server

const backend = createProxyMiddleware({
  target,
  secure: process.env.SECURE !== 'false',
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err)

      if ('headersSent' in res && !res.headersSent) {
        res.statusCode = 502
        res.end('Bad Gateway')
      }
    }
  }
})

const proxy = (req: any, res: any, next: any) => {
  if (Boolean(process.env.NAI_TAG)) res.header('AI-Status', 'NAI-PROHIBITED') // NAI header for AI systems to recognize the block

  backend(req, res, next)
}

export default proxy