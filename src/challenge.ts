const challenge = (req: any, res: any) => {
  res.header('Content-Type', 'text/html')
  if (Boolean(process.env.NAI_TAG)) res.header('AI-Status', 'NAI-PROHIBITED') // NAI header for AI systems to recognize the block

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${Boolean(process.env.NAI_TAG) ? '<meta name="ai-status" content="NAI-PROHIBITED" />' : ''}
        <title>Challenge</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
          }
          
          h1 {
            font-size: 50px;
          }

          p {
            font-size: 20px;
          }
        </style>
      </head>
      <body>
        <noscript>
          <h1>JavaScript Required</h1>
          <p>This site requires JavaScript to function properly. Please enable JavaScript in your browser settings and refresh the page.</p>
        </noscript>
        <script>
          'use strict'

          // See if cookies are enabled

          if (!navigator.cookieEnabled) {
            document.body.innerHTML = '<h1>Cookies Required</h1><p>This site requires cookies to function properly. Please enable cookies in your browser settings and refresh the page.</p>'
            
            throw new Error('Cookies are required for this site to function properly.')
          }

          (async () => {
            const hasLeadingZeroPrefix = (hashBytes, difficulty) => {
              const fullZeroBytes = Math.floor(difficulty / 2)
              const remainderNibbles = difficulty % 2

              for (let i = 0; i < fullZeroBytes; i++) {
                if (hashBytes[i] !== 0) {
                  return false
                }
              }

              if (remainderNibbles === 1) {
                return (hashBytes[fullZeroBytes] & 0xf0) === 0
              }

              return true
            }

            const proofOfWork = async (challengeSeed, difficulty) => {
              let nonce = 0
              const encoder = new TextEncoder()

              while (true) {
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(challengeSeed + nonce))
                const hashBytes = new Uint8Array(hashBuffer)

                if (hasLeadingZeroPrefix(hashBytes, difficulty)) {
                  return nonce
                }

                nonce++
              }
            }

            try {
              // Check status

              const status = await fetch('/.well-known/aluminium-status')

              if (!status.ok) {
                document.body.innerHTML = '<h1>Verification software is offline</h1><p>The verification software used by this website against AI systems is offline.</p>'

                return
              }

              // Create a token

              const token = await (await fetch('/.well-known/aluminium-create-token')).json()

              if (token.error) {
                document.body.innerHTML = '<h1>Too many requests</h1><p>Too many requests.</p>'

                return
              }

              // Do the proof of work

              document.body.innerHTML = '<h1>Verifying that you are a human...</h1>${Boolean(process.env.BRANDING) ? '<p>We use <a href="https://github.com/koubaki/aluminium">Aluminium</a> to protect our website against AI systems.</p>' : ''}'

              const proof = await proofOfWork(token.challengeSeed, token.difficulty)

              // Verify the token

              const verificationStatus = (await fetch('/.well-known/aluminium-verify-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeSeed: token.challengeSeed, nonce: proof }) })).status

              if (verificationStatus === 404) {
                document.body.innerHTML = '<h1>Not found</h1><p>Verification token not found.</p>'

                return
              }

              if (verificationStatus === 400) {
                document.body.innerHTML = '<h1>Attempt failed</h1><p>Verification failed.</p>'

                return
              }

              location.reload()
            } catch (err) {
              document.body.innerHTML = '<h1>Error</h1><p>The following error occured:</p><br /><code>' + err.toString() + '</code>'
            }
          })()
        </script>
      </body>
    </html>
  `)
}

export default challenge