const Koa = require('koa');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const router = require('./routes');


const PORT = process.env.PORT || 3000;

const app = new Koa();

router.get('/', async ctx => {
  ctx.body = 'Hello mundo!';
});

app.use(cors({
  origin: '*', // Allows all origins; change this to a specific origin if needed
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.use(bodyParser());

// Usar el router en la app
app.use(router.routes())
app.use(router.allowedMethods());

const server = app.listen(PORT, async () => {
  console.log(`Servidor Koa corriendo en http://localhost:${PORT}`);  
});

module.exports = { app, server };