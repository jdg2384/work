const request = require('supertest');
const server = require('../server.js')

describe('GET /api', function () {
    it('respond with json containing a list of all users', function (done) {
        request(server)
            .get('/api')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200, done);
    });
});

describe('POST /signup', function () {
    it('respond with json containing id, email', function (done) {
        request(server)
            .post('/signup')
            .set('Accept', 'application/json')
            .send({
                email: 'email@gmail.com',
                password: 'password'
            })
            .expect(200, {
                id: 1,
                email: 'email@gmail.com'
            }, done)
    });
});
