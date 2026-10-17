const express = require('express')

const app = express()
app.use(express.json())

app.get('/', (req, res)=>{
    res.json({
        message: 'Hello World'
    })
})

app.get('/api/status', (req, res)=>{
    res.json({
        status: 'success',
        message: 'API is working',
        timestamp: new Date().toISOString()
    })
})

app.listen(5000, ()=>{
    console.log('Server is running on port 5000')
})