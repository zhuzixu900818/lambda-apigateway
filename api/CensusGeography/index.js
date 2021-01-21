const pg = require('pg');
const gj = require('geojson')

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
  var q = 'select geoid' + event.pathParameters.year.substring(2,4) + ',' +
          'namelsad' + event.pathParameters.year.substring(2,4) + ',' +
          'st_asgeojson(st_simplify(geom,0.00005))::json as geo' +
      ' from geography.' + event.pathParameters.geounit +
      '_state_geography_' + event.pathParameters.year
  if (event.queryStringParameters) {
    if (event.queryStringParameters.geoid) {
    q += ' where geoid' + event.pathParameters.year.substring(2,4) + ' in (' + event.queryStringParameters.geoid + ')'
    }
  }
  console.log(q)

    try {
      var {rows}  = await query(q)
      rows = gj.parse(rows, {GeoJSON: 'geo'})
      
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
