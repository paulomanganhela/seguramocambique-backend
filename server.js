const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

const Pagamento = mongoose.model('Pagamento', new mongoose.Schema({
  phone_number: String,
  provider: String,
  reference: String,
  amount: Number,
  date: String
}));

function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send('Token requerido');
  jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send('Token inválido');
    req.user = decoded;
    next();
  });
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'Segura333') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

app.post('/api/pagamentos', verifyToken, async (req, res) => {
  const pagamento = new Pagamento({ ...req.body, date: new Date().toISOString() });
  await pagamento.save();
  io.emit('novo_pagamento', pagamento);
  res.json(pagamento);
});

app.get('/api/pagamentos', verifyToken, async (req, res) => {
  const pagamentos = await Pagamento.find().sort({ date: -1 });
  res.json(pagamentos);
});

io.on('connection', (socket) => {
  console.log('Cliente conectado ao socket');
});
// Novo modelo para pedidos de instalação
const Pedido = mongoose.model('Pedido', new mongoose.Schema({
  nome: String,
  telefone: String,
  tipo_camera: String,
  quantidade: Number,
  cidade: String,
  distancia: String,
  valor_instalacao: String,
  valor_transporte: String,
  total_estimado: String,
  data_criacao: { type: Date, default: Date.now }
}));

// Nova rota para receber pedidos
app.post('/api/pedidos', async (req, res) => {
  try {
    const pedido = new Pedido(req.body);
    await pedido.save();
    res.status(201).json({ mensagem: "Pedido recebido com sucesso!" });
  } catch (error) {
    console.error('Erro ao salvar pedido:', error);
    res.status(500).json({ erro: "Erro ao salvar pedido" });
  }
});

// Nova rota para listar pedidos (admin futuro)
app.get('/api/pedidos', async (req, res) => {
  try {
    const pedidos = await Pedido.find().sort({ data_criacao: -1 });
    res.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ erro: "Erro ao buscar pedidos" });
  }
});

mongoose.connect(MONGO_URI)
  .then(() => server.listen(PORT, () => console.log(`Servidor no ar na porta ${PORT}`)))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));
