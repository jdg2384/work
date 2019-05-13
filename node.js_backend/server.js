const express =require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.static('public'))

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

const routes = require('./server/routes/routes.js');
const signup = require('./server/routes/signup.js');

app.use('/api', routes);
app.use('/signup', signup);


//Error
const listener = () => console.log( `Listening on port ${port}!`)
app.listen(port, listener)

module.exports = app