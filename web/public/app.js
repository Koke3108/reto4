document.addEventListener('DOMContentLoaded', function () {
    const loginSection = document.getElementById('loginSection');
    const appSection = document.getElementById('appSection');
    const loginForm = document.getElementById('loginForm');
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

    // EVENTO DE LOGIN: Mantenemos la funcionalidad de login intacta.
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
            .then(res => {
                if (res.ok) {
                    // Ocultamos la sección de login y mostramos la aplicación
                    loginSection.classList.add('hidden');
                    appSection.classList.remove('hidden');

                    // Esperamos un breve instante para que el contenedor se renderice y luego recalculamos el tamaño del mapa
                    setTimeout(() => {
                        map.invalidateSize();
                        loadPoints();
                    }, 0);
                } else {
                    alert('Error de login');
                }
            });
    });

    // EVENTO DE LOGOUT
    logoutBtn.addEventListener('click', function () {
        fetch('/logout')
            .then(() => {
                location.reload();
            });
    });

    // Función para cargar los puntos desde el servidor
    function loadPoints() {
        fetch('/api/points')
            .then(res => res.json())
            .then(data => {
                renderPoints(data);
            });
    }

    // Función para renderizar la lista de puntos y los marcadores en el mapa
    function renderPoints(points) {
        // Limpiamos la lista y removemos los marcadores existentes
        pointsList.innerHTML = '';
        for (let key in markers) {
            map.removeLayer(markers[key]);
        }
        markers = {};

        // Filtramos los puntos si se ha seleccionado alguna categoría
        const filterValue = categoryFilter.value;
        const filteredPoints = points.filter(p => !filterValue || p.category === filterValue);

        filteredPoints.forEach(point => {
            // Crear elemento de lista
            const li = document.createElement('li');
            li.textContent = `${point.title} (${point.category})`;

            // Botón para editar
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.addEventListener('click', () => {
                fillForm(point);
            });
            li.appendChild(editBtn);

            // Botón para eliminar
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.addEventListener('click', () => {
                if (confirm('¿Está seguro de eliminar este punto?')) {
                    deletePoint(point.id);
                }
            });
            li.appendChild(deleteBtn);

            pointsList.appendChild(li);

            // Agregar marcador al mapa
            const marker = L.marker([point.lat, point.lng]).addTo(map)
                .bindPopup(`
            <b>${point.title}</b><br>
            ${point.description}<br>
            <img src="${point.image}" alt="${point.title}" width="100">
          `);
            markers[point.id] = marker;
        });
    }

    // EVENTO DEL FORMULARIO: Agregar/editar punto
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
            // Editar punto existente
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
            // Agregar nuevo punto
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

    // Botón para cancelar la edición y reiniciar el formulario
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

    // Función para eliminar un punto
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

    // Actualizar la lista cuando se cambia el filtro de categoría
    categoryFilter.addEventListener('change', loadPoints);

    // Funcionalidad para buscar el museo más cercano a la ubicación del usuario
    nearestBtn.addEventListener('click', function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const { latitude, longitude } = position.coords;
                fetch(`/api/nearest?lat=${latitude}&lng=${longitude}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.point) {
                            nearestInfo.innerHTML = `
                  El museo más cercano es <b>${data.point.title}</b>
                  a una distancia de ${data.distance.toFixed(2)} km.
                `;
                            // Abrir el popup del marcador y centrar el mapa
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
