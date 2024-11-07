const Router = require('@koa/router');
const router = new Router();
const axios = require('axios');
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

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

// const guiones = require('./routes/guiones');

// router.get('/', async ctx => {
//   ctx.body = 'Ruta principal de la API';
// });
async function getAndSaveData(url) {
  try {
    const pageResponse = await axios.get(url);
    const htmlContent = pageResponse.data
    let textContent = htmlContent.replace(/<[^>]*>/g, ' ');

    const indexOfWrittenBy = textContent.indexOf("Written by");
    if (indexOfWrittenBy !== -1) {
      textContent = textContent.substring(indexOfWrittenBy);
    }

    textContent = textContent
      .replace(/[\r\n\t]+/g, " ")
      .replace(/(\s*The Internet Movie Script Database[^\n]*\n|\s*IMSDb)/g, '')
      .replace(/\s{2,}/g, " ")
      .replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ]/g, "")

    return textContent.trim();
  } catch (error) {
    console.log(error);
    return null;
  }
  
}

async function textToFragments(text) {
  chunckSize = 500;
  chunkOverlap = 100;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });
  const textChunks = await splitter.splitText(text);
  return textChunks;
}

async function generateEmbedding(text) {
  try {
    const embedding = await axios.post('http://tormenta.ing.puc.cl/api/embed', {
      "model": "nomic-embed-text",
      "input": text
    });
    return embedding.data.embeddings[0];
  } catch (error) {
    console.log(error);
    return null;
  }
}


router.post('/query', async ctx => {
  try {
    const { url } = ctx.request.body

    //Obtener URL
    // const text = await getAndSaveData(url);

    // obtener fragmentos de la db


    // Realizar query
    let information = "dfmasdfhsadfnsad"
    let question = "¿Qué pasa?"

    const llmMessage = `Dada la información proporcionada sobre una pelicula, responde la pregunta que se te hace a continuación.
      Información: ${information}
      Pregunta: ${question}`;

    const llmQuery = await axios.post('http://tormenta.ing.puc.cl/api/generate', {
      model: 'llama3.2',
      prompt: llmMessage,
      stream: false,
    });

    ctx.body = llmQuery.data.response
  } catch (error) {
    console.log(error)
    ctx.status(500).send(error)
  }
});

async function saveDataToDb(name, url) {
  try {
    for (let i = 0; i < movies_data.length; i++) {
      const text = await getAndSaveData(movies_data[i].url);
      const textChunks = await textToFragments(text);
      for (let j = 0; j < textChunks.length; j++) {
        const embedding = await generateEmbedding(textChunks[j]);
        // Guardar el embedding en pinecone
      }
    }
  } catch (error) {
    console.log(error);
  }
}

module.exports = router;