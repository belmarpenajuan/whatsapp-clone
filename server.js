const express = require('express'); 
const http = require('http'); 
const { Server } = require ('socket.io'); 
const {initializeApp, cert} = require('firebase-admin/app')
const {getFirestore, FieldValue} = require('firebase-admin/firestore');

const app = express(); 
const server = http.createServer(app); 
const io = new Server(server); 


// Inicializar Firebase 
const serviceAccount = require("./whatsapp-2-53dcf-firebase-adminsdk-fbsvc-2bdce6096d.json");

initializeApp({
    credential: cert(serviceAccount)
})

const db = getFirestore(); 

// consuma datos de la carpeta public 

app.use(express.static('public')); 

io.on('connection', (socket) => { 
   console.log(`Nuevo usuario conectado (ID: ${socket.id})`);

   // chat general por defecto 

   socket.currentRoom = 'general'; 
   socket.join('general');


    // "escuchar" cuando el usuario defina su nombre 

    socket.on('nuevo_usuario' , async (nombre) => { 
        socket.username = nombre;
        const msgSistema = `${socket.username} se ha unido al chat`;
        
        // Guardar mensaje de sistema en Firebase 
        
        const canalDestino = socket.currentRoom || 'general';
        try {
            await db.collection('mensajes').add({
                tipo: 'sistema', 
                canal: canalDestino,
                datos: msgSistema, 
                timestamp: FieldValue.serverTimestamp()
            });
        } catch (e) { console.error(e); }
        
        io.to(canalDestino).emit('mensaje_sistema', { canal: canalDestino, msg: msgSistema });
    });

    // escuchar mensajes del chat y transmitirlos a todoooos 
   socket.on('mensaje_chat', async (data) => { 
        const ahora = new Date();
        const horaFormateada = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const datosMensaje = {
            usuario: socket.username || 'Anónimo', 
            texto: data.texto, 
            archivo: data.archivo, 
            hora: horaFormateada
        };   

        const canalDestino = socket.currentRoom || 'general';

        try {
            await db.collection('mensajes').add({
                tipo: 'chat', 
                canal: canalDestino,
                datos: datosMensaje, 
                timestamp: FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Error al guardar mensaje en Firestore:", error);
        }

        // Enviamos a todos el objeto estructurado para disparar el sonido en background
        io.to(canalDestino).emit('mensaje_chat', { 
            canal: canalDestino, 
            datos: datosMensaje 
        });
    });
   socket.on('cambiar_canal', (nuevoCanal) => {
    console.log(`Usuario ${socket.username || socket.id} se cambió al chat: ${nuevoCanal}`);

    // sacar el socket de la sala anterior y meterlo a la neuva 
    socket.leave(socket.currentRoom); 
    socket.join(nuevoCanal); 
    socket.currentRoom = nuevoCanal; // Actualizar estado del socket  
   }); 
    // manejar desconexiones 
   socket.on('disconnect', async () => { 
        if (socket.username) { 
            const msgSistema = `${socket.username} se ha ido...`;
            const canalDestino = socket.currentRoom || 'general';

            try {
                await db.collection('mensajes').add({
                    tipo: 'sistema', 
                    canal: canalDestino,
                    datos: msgSistema, 
                    timestamp: FieldValue.serverTimestamp()
                });
            } catch (e) { console.error(e); }
            
            io.to(canalDestino).emit('mensaje_sistema', { canal: canalDestino, msg: msgSistema });
        }
    });
});

// endpoint para que el cliente descargue el historial real desde firebase

app.get('/api/historial', async(req, res) => { 
    try { 
      const canalSolicitado = req.query.canal || 'general';
        
        // El filtro .where() asegura traer únicamente los datos de la sala seleccionada
        const snapshot = await db.collection('mensajes')
                                   .where('canal', '==', canalSolicitado)
                                   .get(); 
        const historial = []; 
        snapshot.forEach(doc => {
            const data = doc.data(); 
            historial.push({ 
                tipo: data.tipo, 
                datos: data.datos,
                // Guardamos el timestamp para ordenarlo en el cliente si es necesario
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
            }); 
        }); 
        
        // Ordenamos los mensajes aquí por fecha antes de enviarlos al chat
        historial.sort((a, b) => a.timestamp - b.timestamp);

        res.json(historial); 
    } catch (error) { 
        console.error("Error crítico en el servidor:", error);
        res.status(500).json({ error: error.message }); 
    }
});

    // levantar el servidor en el puerto 3000

    const PORT = process.env.PORT || 3000; 
    server.listen(PORT, () => { 
      console.log(`servidor ejecutandose en http://localhost:${PORT}`); 
    });



