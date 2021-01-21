const pg = require('pg');

var connectionString = {
  user: 'user',
  host: 'host',
  database: 'db',
  password: 'pw',
  port: 5432,
};

async function query (q) {
  var pool = new pg.Pool(connectionString);
  const client = await pool.connect()
  let res
  try {
    await client.query('BEGIN')
    try {
      res = await client.query(q)
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
  } finally {
    client.end()
  }
  return res
}

//parse postgres numeric into number instead of string as default
var types = require('pg').types
types.setTypeParser(1700, 'text', parseFloat);

exports.handler = async (event, context, callback) => {
  var q = 'select geoid10, ' + event.queryStringParameters.fields +
      ' from acs5.' + event.pathParameters.geounit +
      '_state_' + event.pathParameters.table +
      '_' + event.pathParameters.year
  if (event.queryStringParameters.geoid10) {
    q += ' where geoid10 in (' + event.queryStringParameters.geoid10 + ')'
  }
  console.log(q)

    try {
      const {rows}  = await query(q)
      
      var response = {
          "statusCode": 200,
          "headers": {
              "Content-Type" : "application/json",
              'Access-Control-Allow-Origin': '*' 
          },
          "body": JSON.stringify(rows),
          "isBase64Encoded": false
      };
      callback(null, response);
    } catch (err) {
      console.log('Database ' + err)
      callback(null, 'Database ' + err);
    }
};
