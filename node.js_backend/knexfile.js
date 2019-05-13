'use strict';
module.exports = {
 development: {
   client: 'pg',
   connection: 'postgres://localhost/starter',
 },
 test: {
   client: 'pg',
   connection: 'postgres://localhost/starter',
 },

 production: {
   client: 'pg',
   connection: process.env.DATABASE_URL
 }
};
