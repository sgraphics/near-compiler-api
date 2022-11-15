import express, { Express, request, Request, Response } from 'express';
import { CompilerWrapper } from './compiler';

const app: Express = express();
app.use(express.json());

const port = process.env.PORT;

const compiler = new CompilerWrapper();

app.get('/', (req: Request, res: Response) => {
  res.send('Near Compiler API Server');
});

app.post('/compile', async (request: Request, res: Response) => {
  const compileResult = await compiler.compile(request.body);
  res.json(compileResult);
});


app.listen(port, async () => {
  console.log(`⚡️[server]: Initializing build environment...`);
  compiler.init();

  console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});