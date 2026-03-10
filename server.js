const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cargar leads
app.get('/api/load', (req, res) => {
  try {
    const file = path.join(__dirname, 'data', 'leads.json');
    if (!fs.existsSync(file)) return res.json({ status: 'ok', leads: [] });
    const leads = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json({ status: 'ok', leads });
  } catch (e) {
    res.json({ status: 'error', leads: [], msg: e.message });
  }
});

// Guardar leads
app.post('/api/save', (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads)) return res.status(400).json({ status: 'error', msg: 'Formato incorrecto' });
    const file = path.join(__dirname, 'data', 'leads.json');
    fs.writeFileSync(file, JSON.stringify(leads, null, 2), 'utf8');
    res.json({ status: 'ok', count: leads.length });
  } catch (e) {
    res.status(500).json({ status: 'error', msg: e.message });
  }
});

// Health check para Render
app.get('/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AGO CRM activo en puerto ${PORT}`);
});
