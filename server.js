const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Servir archivos estáticos desde la carpeta "web/public"
app.use(express.static('web/public'));

// Configuración para parsear JSON
app.use(bodyParser.json());

// Configuración de sesiones
app.use(session({
    secret: 'mi-secreto',
    resave: false,
    saveUninitialized: true
}));

// Almacenamiento en memoria de puntos de interés (museos)
let points = [
    {
        id: 1,
        title: 'Museo del Prado',
        description: 'Museo de arte clásico en Madrid.',
        lat: 40.4138,
        lng: -3.6921,
        image: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Museo_del_Prado_-_Entrada_principal.jpg',
        category: 'Arte'
    },
    {
        id: 2,
        title: 'Museo Reina Sofía',
        description: 'Museo de arte moderno y contemporáneo.',
        lat: 40.4086,
        lng: -3.6943,
        image: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Museo_Reina_Sof%C3%ADa_entrance.jpg',
        category: 'Arte'
    }
];
let currentId = points.length;

// Usuarios fijos para autenticación
const users = [
    { username: 'admin', password: 'admin' },
    { username: 'user', password: 'user' }
];

// Middleware para proteger rutas (requiere autenticación)
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        res.status(401).json({ message: 'No autorizado' });
    }
}

// Endpoint de login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.user = user;
        res.json({ message: 'Login exitoso' });
    } else {
        res.status(401).json({ message: 'Credenciales inválidas' });
    }
});

// Endpoint de logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout exitoso' });
});

// Endpoint para obtener todos los puntos
app.get('/api/points', (req, res) => {
    res.json(points);
});

// Endpoint para agregar un nuevo punto (requiere autenticación)
app.post('/api/points', isAuthenticated, (req, res) => {
    const { title, description, lat, lng, image, category } = req.body;
    currentId++;
    const newPoint = { id: currentId, title, description, lat, lng, image, category };
    points.push(newPoint);
    res.json(newPoint);
});

// Endpoint para actualizar un punto existente (requiere autenticación)
app.put('/api/points/:id', isAuthenticated, (req, res) => {
    const id = parseInt(req.params.id);
    const point = points.find(p => p.id === id);
    if (point) {
        const { title, description, lat, lng, image, category } = req.body;
        point.title = title;
        point.description = description;
        point.lat = lat;
        point.lng = lng;
        point.image = image;
        point.category = category;
        res.json(point);
    } else {
        res.status(404).json({ message: 'Punto no encontrado' });
    }
});

// Endpoint para eliminar un punto (requiere autenticación)
app.delete('/api/points/:id', isAuthenticated, (req, res) => {
    const id = parseInt(req.params.id);
    const index = points.findIndex(p => p.id === id);
    if (index !== -1) {
        const deletedPoint = points.splice(index, 1);
        res.json(deletedPoint[0]);
    } else {
        res.status(404).json({ message: 'Punto no encontrado' });
    }
});

// Endpoint para obtener el punto más cercano usando la fórmula de Haversine
app.get('/api/nearest', (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ message: 'Se requieren lat y lng' });
    }
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    function haversineDistance(lat1, lng1, lat2, lng2) {
        const toRad = angle => angle * Math.PI / 180;
        const R = 6371; // Radio de la Tierra en km
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    let nearest = null;
    let minDistance = Infinity;
    for (const point of points) {
        const distance = haversineDistance(userLat, userLng, point.lat, point.lng);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = point;
        }
    }
    res.json({ point: nearest, distance: minDistance });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
