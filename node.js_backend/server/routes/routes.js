const express = require('express')
const router = express.Router()
const knex = require('../../knex');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser')
// Imported Functions
const { getAllUsers, getOneUser } = require('../queries/queries.js')

router.use(express.static('public'))

router.get('/', getAllUsers)
router.get('/:id', getOneUser)

module.exports = router