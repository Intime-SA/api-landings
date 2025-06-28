const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_DB_URI;

if (!uri) {
  throw new Error('Please define the MONGO_DB_URI environment variable inside .env');
}

// Definir las opciones
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Asegúrate de que estas opciones sean adecuadas para tu caso de uso
  // Puedes necesitar ajustar `maxPoolSize`, `wtimeoutMS`, etc.
  // Consulta la documentación: https://mongodb.github.io/node-mongodb-native/4.9/interfaces/MongoClientOptions.html
};

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // En modo desarrollo, usa una variable global para preservar el valor
  // a través de recargas de módulos causadas por HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
    console.log("MongoDB Connection Initialized (Development)"); // Log para confirmar inicialización
  }
  clientPromise = global._mongoClientPromise;
} else {
  // En producción, es mejor no usar una variable global.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
  console.log("MongoDB Connection Initialized (Production)"); // Log para confirmar inicialización
}

// Función helper para obtener la base de datos 'casinos'
async function getCasinosDB() {
  const client = await clientPromise;
  return client.db('casinos');
}

// Función helper para obtener una colección específica
async function getCollection(collectionName) {
  const db = await getCasinosDB();
  return db.collection(collectionName);
}

module.exports = {
  clientPromise,
  getCasinosDB,
  getCollection
}; 