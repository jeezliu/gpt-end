export default async function (req, res) {
  if (req.method !== 'POST') {
    res.status(400).json({
      code: 400,
      error: {
        message: '不支持的请求方式',
      }
    })
  }
  console.log(process.env.TOKEN, req.body.token)
  if (req.body.token === process.env.TOKEN) {
    res.status(200).json({
      code: 200,
      message: '通过'
    })
  }
  res.status(401).json({
    code: 401,
    error: {
      message: '不通过'
    }
  })
}
