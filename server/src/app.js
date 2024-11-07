const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const axios = require('axios');
const Router = require('@koa/router');
const { Pinecone } = require('@pinecone-database/pinecone');
const api_key = "pcsk_5rVMc3_6FGLDD2WhGZKZXFznxuKgtGjQqXFqhJBjpcDssNPqVyndCgseh4fr7TxXKxt3nV";

const movies_data = [
  { name: "Matrix Reloaded, The", url: "https://imsdb.com/scripts/Matrix-Reloaded,-The.html" },
  { name: "Puss in Boots: The Last Wish", url: "https://imsdb.com/scripts/Puss-in-Boots-The-Last-Wish.html" },
  { name: "Thor: Ragnarok", url: "https://imsdb.com/scripts/Thor-Ragnarok.html" },
  { name: "TRON", url: "https://imsdb.com/scripts/TRON.html" },
  { name: "War Horse", url: "https://imsdb.com/scripts/War-Horse.html" },
  { name: "28 Days Later", url: "https://imsdb.com/scripts/28-Days-Later.html" },
  { name: "I, Robot", url: "https://imsdb.com/scripts/I,-Robot.html" },
  { name: "Guardians of the Galaxy Vol. 2", url: "https://imsdb.com/scripts/Guardians-of-the-Galaxy-Vol-2.html" },
  { name: "The Green Mile", url: "https://imsdb.com/scripts/Green-Mile,-The.html" },
  { name: "American History X", url: "https://imsdb.com/scripts/American-History-X.html" },
];

const PORT = process.env.PORT || 5000;
const app = new Koa();
const router = new Router();

async function getFilmScript(url) {
  try {
    const pageResponse = await axios.get(url);
    let textContent = pageResponse.data.replace(/<[^>]*>/g, ' ');

    const indexOfWrittenBy = textContent.indexOf("Written by");
    if (indexOfWrittenBy !== -1) {
      textContent = textContent.substring(indexOfWrittenBy);
    }

    textContent = textContent
      .replace(/[\r\n\t]+/g, " ")
      .replace(/(\s*The Internet Movie Script Database[^\n]*\n|\s*IMSDb)/g, '')
      .replace(/\s{2,}/g, " ")
      .replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ]/g, "");

    return textContent.trim();
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function textToFragments(text) {
  const chunkSize = 500;
  const chunkOverlap = 50;

  const textChunks = [];
  for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
    const fragment = text.slice(i, i + chunkSize);
    textChunks.push(fragment);
  }
  return textChunks;
}

async function generateEmbedding(text) {
  try {
    const response = await axios.post('http://tormenta.ing.puc.cl/api/embed', {
      model: "nomic-embed-text",
      input: text,
    });
    return response.data.embeddings[0];
  } catch (error) {
    console.log(error);
    return null;
  }
}

const pc = new Pinecone({
  apiKey: api_key,
});

const indexName = 'quickstart';

async function createIndex() {
  try {
    // Obtener el array de índices
    const indexesData = await pc.listIndexes();
    const indexes = indexesData.indexes.map(index => index.name);

    // Verificar si el índice ya existe
    if (indexes.includes(indexName)) {
      console.log(`El índice ${indexName} ya existe.`);
      return;
    }
    
    // Crear el índice si no existe
    await pc.createIndex({
      name: indexName,
      dimension: 768,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });
    console.log(`Índice ${indexName} creado.`);
  } catch (error) {
    console.log("Error al crear el índice:", error);
  }
}

async function queryEmbeddings(indexName, queryVector) {
  console.log(`Realizando consulta al índice ${indexName}...`);
  console.log(`Vector de consulta: ${queryVector}`);
  const index = pc.Index(indexName);

  const result = await index.query({
    queryVector: queryVector,
    topK: 5,  // Número de resultados que deseas recuperar
    includeMetadata: true,
  });

  return result;
}


router.get('/', async ctx => {
  ctx.body = 'Hello mundo!';
});

router.post('/query', async ctx => {
  try {
    const { message } = ctx.request.body;
    const index = await pc.index(indexName);

    const vector = await generateEmbedding(message);

    const queryResponse = await index.namespace("ns1").query({
      topK: 5,
      vector: vector,
      includeValues: false,
      includeMetadata: true
    });

    console.log(queryResponse);
    const fragments = queryResponse.matches.map(match => match.metadata.text);
    // for (let i = 0; i < queryResponse.matches.length; i++) {
    //   console.log(`Resultado ${i}: ${queryResponse.matches[i].metadata} - Fragmento ${queryResponse.matches[i].metadata.fragmentIndex}`);
    // }
    console.log(fragments)

    const llmMessage = `Dada la información proporcionada sobre una pelicula, responde la pregunta que se te hace a continuación.
      Información: ${fragments}
      Pregunta: ${message}`;

    const llmQuery = await axios.post('http://tormenta.ing.puc.cl/api/generate', {
      model: 'llama3.2',
      prompt: llmMessage,
      stream: false,
    });

    ctx.body = llmQuery.data.response;
  } catch (error) {
    console.log(error);
    ctx.status = 500;
    ctx.body = error.message;
  }
});

async function saveDataToDb() {
  try {
    // Crear el índice utilizando el nombre del índice definido
    const index = pc.index(indexName);

    for (let i = 0; i < movies_data.length; i++) {
      console.log(`Guardando datos de la película ${movies_data[i].name}...`);
      const movieName = movies_data[i].name;
      const text = await getFilmScript(movies_data[i].url);

      // Dividir el texto en fragmentos
      const textChunks = await textToFragments(text);

      // Crear un array para almacenar los vectores generados de cada fragmento de la película actual
      const vectors = [];

      for (let j = 0; j < textChunks.length; j++) {
        const embedding = await generateEmbedding(textChunks[j]);
        // Añadir cada vector al array de vectores
        vectors.push({
          id: `${movieName}-${j}`,                // ID único para cada fragmento
          values: embedding,                      // Embedding generado
          metadata: { name: movieName, fragmentIndex: j, text: textChunks[j] } // Metadatos opcionales
        });
        console.log(`Embedding generado para el fragmento ${j} de la película ${movieName}.`);
      }

      // Realizar la inserción de todos los vectores de esta película en el namespace 'ns1'
      await index.namespace('ns1').upsert(vectors);
      console.log("Vectores subidos correctamente al namespace 'ns1'");
    }
  } catch (error) {
    console.error("Error al guardar datos en la base de datos:", error);
  }
}

app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

router.get('/generate', async ctx => {
  saveDataToDb();
  ctx.body = 'Data saved';
});


const server = app.listen(PORT, async () => {
  await createIndex();
  // await saveDataToDb();
  // const stats = await pc.index(indexName).describeIndexStats();
  // console.log("Estadísticas del índice:", stats);
  // console.log(`Número de vectores en el índice '${indexName}': ${stats.dimension}`);
  console.log(`Servidor Koa corriendo en http://localhost:${PORT}`);
});

module.exports = { app, server };
