document.addEventListener('DOMContentLoaded', function () {
    const logoutBtn = document.getElementById('logoutBtn');
    const pointsList = document.getElementById('pointsList');
    const pointForm = document.getElementById('pointForm');
    const formTitle = document.getElementById('formTitle');
    const cancelEdit = document.getElementById('cancelEdit');
    const categoryFilter = document.getElementById('categoryFilter');
    const nearestBtn = document.getElementById('nearestBtn');
    const nearestInfo = document.getElementById('nearestInfo');

    // Inicializamos el mapa en el elemento con id "map"
    let map = L.map('map').setView([40.4168, -3.7038], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
    let markers = {};

    // Cargar puntos desde el servidor
    loadPoints();

    // Logout: redirige al login tras destruir la sesión
    logoutBtn.addEventListener('click', function () {
        fetch('/logout')
            .then(() => {
                window.location.href = 'index.html';
            });
    });

    // Función para cargar los puntos
    function loadPoints() {
        fetch('/api/points')
            .then(res => res.json())
            .then(data => {
                renderPoints(data);
            });
    }

    // Renderiza la lista y agrega marcadores al mapa
    function renderPoints(points) {
        pointsList.innerHTML = '';
        for (let key in markers) {
            map.removeLayer(markers[key]);
        }
        markers = {};

        const filterValue = categoryFilter.value;
        const filteredPoints = points.filter(p => !filterValue || p.category === filterValue);
        filteredPoints.forEach(point => {
            const li = document.createElement('li');
            li.textContent = `${point.title} (${point.category})`;

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => {
                fillForm(point);
            });
            li.appendChild(editBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.addEventListener('click', () => {
                if (confirm('¿Está seguro de eliminar este punto?')) {
                    deletePoint(point.id);
                }
            });
            li.appendChild(deleteBtn);

            pointsList.appendChild(li);

            const marker = L.marker([point.lat, point.lng]).addTo(map)
                .bindPopup(`
            <b>${point.title}</b><br>
            ${point.description}<br>
            <img src="${point.image}" alt="${point.title}" width="100">
          `);
            markers[point.id] = marker;
        });
    }

    // Manejo del formulario para agregar/editar puntos
    pointForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const id = document.getElementById('pointId').value;
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const lat = parseFloat(document.getElementById('lat').value);
        const lng = parseFloat(document.getElementById('lng').value);
        const image = document.getElementById('image').value;
        const category = document.getElementById('category').value;
        const pointData = { title, description, lat, lng, image, category };

        if (id) {
            fetch(`/api/points/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pointData)
            })
                .then(res => {
                    if (res.ok) {
                        resetForm();
                        loadPoints();
                    } else {
                        alert('Error al editar el punto');
                    }
                });
        } else {
            fetch('/api/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pointData)
            })
                .then(res => {
                    if (res.ok) {
                        resetForm();
                        loadPoints();
                    } else {
                        alert('Error al agregar el punto');
                    }
                });
        }
    });

    cancelEdit.addEventListener('click', resetForm);

    function fillForm(point) {
        document.getElementById('pointId').value = point.id;
        document.getElementById('title').value = point.title;
        document.getElementById('description').value = point.description;
        document.getElementById('lat').value = point.lat;
        document.getElementById('lng').value = point.lng;
        document.getElementById('image').value = point.image;
        document.getElementById('category').value = point.category;
        formTitle.textContent = 'Editar Museo';
        cancelEdit.classList.remove('hidden');
    }

    function resetForm() {
        document.getElementById('pointId').value = '';
        pointForm.reset();
        formTitle.textContent = 'Agregar Museo';
        cancelEdit.classList.add('hidden');
    }

    function deletePoint(id) {
        fetch(`/api/points/${id}`, {
            method: 'DELETE'
        })
            .then(res => {
                if (res.ok) {
                    loadPoints();
                } else {
                    alert('Error al eliminar el punto');
                }
            });
    }

    categoryFilter.addEventListener('change', loadPoints);

    nearestBtn.addEventListener('click', function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const { latitude, longitude } = position.coords;
                fetch(`/api/nearest?lat=${latitude}&lng=${longitude}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.point) {
                            nearestInfo.innerHTML = `El museo más cercano es <b>${data.point.title}</b> a una distancia de ${data.distance.toFixed(2)} km.`;
                            if (markers[data.point.id]) {
                                markers[data.point.id].openPopup();
                                map.setView([data.point.lat, data.point.lng], 15);
                            }
                        } else {
                            nearestInfo.textContent = 'No se encontró ningún museo.';
                        }
                    });
            }, err => {
                alert('Error obteniendo su ubicación');
            });
        } else {
            alert('Geolocalización no soportada');
        }
    });
});
