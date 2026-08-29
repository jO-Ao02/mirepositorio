const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '1234',
  database: 'db_restaurante',
  port: 5432
});

pool.connect()
.then(function (cliente){
    console.log('conexion a postgresql establecida');
    cliente.release();
})
.catch(function (error){
    console.error('error de conexion', error.stack);
});

module.exports = pool;
