const pg = require('pg');

var connectionString = {
  user: 'cfapi',
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
  var q = 'select * from acs5.metadata_table_catalog'
    try {
      var {rows}  = await query(q)
      if (event.queryStringParameters) {
        if (event.queryStringParameters.year) {
          rows = rows.filter(obj => obj.year == event.queryStringParameters.year)
        }
        if (event.queryStringParameters.geounit) {
          rows = rows.filter(obj => obj.geounit == event.queryStringParameters.geounit)
        }
      }

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
