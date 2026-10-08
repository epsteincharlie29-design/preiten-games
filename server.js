// Preiten Games - kleiner Node/Express-Server: liefert die Website und alle Spiele aus
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;   // Render gibt den Port vor

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));
app.get('/health', (req, res) => res.send('ok'));   // für Render (Health Check)
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log('Preiten Games läuft auf http://localhost:' + PORT));
