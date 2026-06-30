const express = require('express');
const path = require('path');
const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.listen(3001, () => console.log('Servidor de imagenes en http://localhost:3001'));
