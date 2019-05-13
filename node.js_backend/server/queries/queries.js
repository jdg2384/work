'use strict';
const express = require('express');
const router = express.Router();
const knex = require('../../knex');

// Get All
const getAllUsers = ('/',(req,res,next) => {
    knex('users')
    .select('id','email')
    .then(data => {
        res.status(200).send(data)
    })
    .catch(err => {
        res.status(404).send(err)
    })
})

// Get One User
const getOneUser = ('/:id',(req,res,next) => {
    let id = req.params.id
    knex('users')
    .where('id',id)
    .select('id','email')
    .then(data => {
        res.send(data[0])
    })
    .catch(err => {
        res.status(404).send(err)
    })
})

// Patch
router.patch('/:id',(req,res,next) => {
    let id = req.params.id
    knex('users')
    .where('id',id)
    .update({
        id:req.body.id,
        name:req.body.name,
        message:req.body.message
    })
    .then(data => {
        res.send(data[0])
    })
    .catch(err => {
        res.status(404).send(err)
    })
})

//Delete
router.delete('/:id',(req,res,next) => {
    let id = req.params.id;
    let body = req.body;
    knex('users')
    .where('id',id)
    .returning(['id','name','message'])
    .del()
    .then(data => {
        res.send(data[0])
    })
    .catch(err => {
        res.status(404).send(err)
    })
})

//error
router.use((err, req, res, next) => {
    const status = err.status || 404
    res.status(status).json({ error: err })
})
  
router.use((req, res, next) => {
    res.status(404).json({ error: { status: 404, message: 'Not found' }})
})


module.exports = {
    getAllUsers,
    getOneUser
  }