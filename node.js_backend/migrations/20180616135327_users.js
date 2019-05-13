exports.up = function(knex, Promise) {
    return knex.schema.createTable('users', table => {
        table.increments('id');
        table.string('email').notNullable().unique();
        table.specificType('password','char(60)').notNullable().unique();
        table.string('salt',30).notNullable();
    })
};
      
exports.down = function(knex, Promise) {
    return knex.schema.dropTable('users')
};
