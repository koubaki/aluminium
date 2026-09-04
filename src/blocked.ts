const blocked = (req: any, res: any) => {
  res.status(403)
  res.header('Content-Type', 'text/html')
  if (Boolean(process.env.NAI_TAG)) res.header('AI-Status', 'NAI-PROHIBITED') // NAI header for AI systems to recognize the block

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${Boolean(process.env.NAI_TAG) ? '<meta name="ai-status" content="NAI-PROHIBITED" />' : ''}
        <title>403 Forbidden</title>
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
        <h1>AI System Blocked</h1>
        <p>This AI system doesn't have permission to access this resource. This website uses special protection against AI systems.</p>
      </body>
    </html>
  `)
}

export default blocked