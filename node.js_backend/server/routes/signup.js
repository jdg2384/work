const express = require('express')
const router = express.Router()
const signUpQueries = require('../queries/signup_queries.js')


router.use(express.static('public'))

router.post('/', signUpQueries.signUpUser)

module.exports = router