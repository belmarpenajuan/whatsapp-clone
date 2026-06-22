const express = require('express'); 
const http = require('http'); 
const { Server } = require ('socket.io'); 
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path = require('path'); 

process.on('uncaughtException', (err) => {
  console.error('💥 ERROR NO CAPTURADO:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('💥 PROMESA RECHAZADA NO MANEJADA:', err);
});

const app = express(); 
const server = http.createServer(app); 


const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
}); 

console.log("✅ Socket.IO inicializado correctamente");

let serviceAccount;
try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
        serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };
    } else {
        serviceAccount = require("./whatsapp-2-53dcf-firebase-adminsdk-fbsvc-2bdce6096d.json");
    }
    
    initializeApp({
        credential: cert(serviceAccount)
    });
} catch (error) {
    console.error("Error inicializando Firebase Admin:", error);
}

const db = getFirestore(); 

app.use(express.static(path.join(__dirname, 'public'))); 

io.on('connection', (socket) => { 
   console.log(`Nuevo usuario conectado (ID: ${socket.id})`);

   socket.currentRoom = 'general'; 
   socket.join('general');

    socket.on('nuevo_usuario' , async (nombre) => { 
        socket.username = nombre;
        const msgSistema = `${socket.username} se ha unido al chat`;
        
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

        io.to(canalDestino).emit('mensaje_chat', { 
            canal: canalDestino, 
            datos: datosMensaje 
        });
    });

   socket.on('cambiar_canal', (nuevoCanal) => {
    console.log(`Usuario ${socket.username || socket.id} se cambió al chat: ${nuevoCanal}`);
    socket.leave(socket.currentRoom); 
    socket.join(nuevoCanal); 
    socket.currentRoom = nuevoCanal;  
   }); 

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

app.get('/historial', async(req, res) => { 
    try { 
        const canalSolicitado = req.query.canal || 'general';
        const snapshot = await db.collection('mensajes')
                                   .where('canal', '==', canalSolicitado)
                                   .get(); 
        const historial = []; 
        snapshot.forEach(doc => {
            const data = doc.data(); 
            historial.push({ 
                tipo: data.tipo, 
                datos: data.datos,
                timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
            }); 
        }); 
        
        historial.sort((a, b) => a.timestamp - b.timestamp);
        res.json(historial); 
    } catch (error) { 
        console.error("Error crítico en el servidor:", error);
        res.status(500).json({ error: error.message }); 
    }
});


console.log("📡 Rutas de socket.io deberían estar activas en /socket.io/");

const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => { 
  console.log(`servidor ejecutandose en el puerto ${PORT}`); 
});