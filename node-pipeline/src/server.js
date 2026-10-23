const createApp = require('./app')

const port = Number(process.env.PORT) || 5000
const app = createApp()

app.listen(port, () => {
  console.log(`Tasks API listening on port ${port}`)
})
