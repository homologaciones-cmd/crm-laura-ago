const express = require('express');
const path = require('path');
const https = require('https');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const COMERCIAL    = process.env.COMERCIAL || 'default';

function supabase(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cargar leads
app.get('/api/load', async (req, res) => {
  try {
    const r = await supabase('GET', `leads?comercial=eq.${encodeURIComponent(COMERCIAL)}&select=lead_data&order=created_at.asc`);
    if (r.status !== 200) return res.json({ status: 'error', leads: [], msg: JSON.stringify(r.body) });
    const leads = (r.body || []).map(row => row.lead_data);
    res.json({ status: 'ok', leads });
  } catch(e) {
    res.json({ status: 'error', leads: [], msg: e.message });
  }
});

// Guardar leads (reemplazar todos)
app.post('/api/save', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads)) return res.status(400).json({ status: 'error', msg: 'Formato incorrecto' });

    // Borrar leads actuales de esta comercial
    await supabase('DELETE', `leads?comercial=eq.${encodeURIComponent(COMERCIAL)}`);

    // Insertar los nuevos
    if (leads.length > 0) {
      const rows = leads.map(lead => ({
        lead_id: String(lead.id || Date.now() + Math.random()),
        comercial: COMERCIAL,
        lead_data: lead
      }));
      const r = await supabase('POST', 'leads', rows);
      if (r.status > 299) return res.json({ status: 'error', msg: JSON.stringify(r.body) });
    }

    res.json({ status: 'ok', count: leads.length });
  } catch(e) {
    res.status(500).json({ status: 'error', msg: e.message });
  }
});

app.get('/ping', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`AGO CRM [${COMERCIAL}] activo en puerto ${PORT}`));
