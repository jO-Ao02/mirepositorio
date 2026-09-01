const { Pool } = require('pg');

const pool = new Pool({
  host : process.env.DB_HOST,
  user : process.env.DB_USER,
  password : String(process.env.DB_PASSWORD),
  database : process.env.DB_NAME,
  port : parseInt(process.env.DB_PORT)
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
