   const firebaseConfig = {
    apiKey: "AIzaSyD6DpcPWdYbRWsgLHfcpy6kNuYXeL6SZUU",
    authDomain: "whatsapp-2-53dcf.firebaseapp.com",
    projectId: "whatsapp-2-53dcf",
    storageBucket: "whatsapp-2-53dcf.firebasestorage.app",
    messagingSenderId: "902728389072",
    appId: "1:902728389072:web:75dff0fd2db5cc463de9d5",
    measurementId: "G-N6GZFT0M6X"
    };

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const socket = io(); 


const form = document.getElementById("form-container"); 
const input = document.getElementById("input-mensaje"); 
const chatCointainer = document.getElementById("chat-container"); 
const inputArchivo = document.getElementById("input-archivo"); 
const btnAdjuntar = document.getElementById("btn-adjuntar");
const btnEmoji = document.getElementById("btn-emoji"); 
const emojiContainer = document.getElementById("emoji-picker-container"); 
const sonidoNotificacion = document.getElementById("sonido-notificacion"); 
const inputBusqueda = document.getElementById("input-busqueda");
const txtCanalActual = document.getElementById("txt-canal-actual");
const labelMiNombre = document.getElementById("label-mi-nombre");
const conversacionesWhatsApp = document.querySelectorAll(".chat-item");
const chatMensajes = document.getElementById("chat-mensajes");

const authScreen = document.getElementById("auth-screen");
const appContainer = document.getElementById("app-container");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authUsername = document.getElementById("auth-username");
const groupUsername = document.getElementById("group-username");
const btnLogin = document.getElementById("btn-login");
const btnToggleRegistro = document.getElementById("btn-toggle-registro");

const btnToggleTema = document.getElementById('btn-toggle-tema');
const btnGoogleNav = document.getElementById('btn-google-nav');
const googleSearchPanel = document.getElementById('google-search-panel');
const btnCerrarGoogle = document.getElementById('btn-cerrar-google');
const iframeGoogle = document.getElementById('iframe-google');

const btnBajarChat = document.createElement('button'); 
const contenedorChat = document.getElementById('chat-container');


let modoRegistro = false; 
let miNombre = ''; 
let canalActual = 'general'; 
let historialMensajes = []; 

// Alternar entre modo "Iniciar Sesión" y "Registrarse"
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        try {  
            await user.reload(); 
        } catch (e) { 
            console.error("error al recargar el usuario:", e);
        }
        const usuarioActualizado = firebase.auth().currentUser;
        miNombre = usuarioActualizado.displayName || usuarioActualizado.email.split('@')[0];
        
        // Ejecutamos la transición visual a la pantalla del chat
        if (authScreen) authScreen.style.display = "none"; 
        if (appContainer) appContainer.style.display = "flex"; 
        if (form) form.style.display = "flex";
        if (labelMiNombre) labelMiNombre.textContent = `🟢 ${miNombre}`;
        
        // Restaurar estado del botón de login por si acaso
        if (btnLogin) {
            btnLogin.disabled = false;
            btnLogin.textContent = modoRegistro ? "Crear Cuenta y Entrar" : "Ingresar";
        }

        // Acciones del chat
        socket.emit('nuevo_usuario', miNombre);  
        cargarHistorial();
    } else {
        // Si no está logueado, forzar vista del formulario de acceso
        if (authScreen) authScreen.style.display = "flex";
        if (appContainer) appContainer.style.display = "none";
        miNombre = '';
    }
});
 
// Alternar entre modo "Iniciar Sesión" y "Registrarse"
if (btnToggleRegistro) {
    btnToggleRegistro.addEventListener('click', () => {
        modoRegistro = !modoRegistro;
        if (modoRegistro) {
            groupUsername.style.display = "block";
            authUsername.setAttribute('required', 'true');
            btnLogin.textContent = "Crear Cuenta y Entrar";
            btnToggleRegistro.textContent = "¿Ya tienes cuenta? Inicia Sesión";
        } else {
            groupUsername.style.display = "none";
            authUsername.removeAttribute('required');
            btnLogin.textContent = "Ingresar";
            btnToggleRegistro.textContent = "¿No tienes cuenta? Regístrate";
        }
    });
}
 
// Escuchar el envío del Formulario en pantalla con control de errores robusto
if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = authEmail.value.trim();
        const password = authPassword.value;
        const username = authUsername.value.trim();
 
        // Deshabilitar botón temporalmente para evitar peticiones duplicadas
        btnLogin.disabled = true;
        const textoOriginalBoton = btnLogin.textContent;
        btnLogin.textContent = "Procesando...";
 
        if (!modoRegistro) {
            // --- LOGICA DE INICIO DE SESIÓN ---
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log("Login exitoso en Firebase, UID:", userCredential.user.uid);
                })
                .catch((error) => {
                    btnLogin.disabled = false;
                    btnLogin.textContent = textoOriginalBoton;
                    
                    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                        Swal.fire('Error de acceso', 'El correo o la contraseña son incorrectos.', 'error');
                    } else if (error.code === 'auth/invalid-email') {
                        Swal.fire('Correo inválido', 'El formato del correo electrónico no es correcto.', 'warning');
                    } else {
                        Swal.fire('Error de Login', error.message, 'error');
                    }
                });
        } else {
            // --- LOGICA DE REGISTRO ---
            if (!username) {
                Swal.fire('Falta información', 'Por favor, introduce un Nombre de Usuario para el registro.', 'warning');
                btnLogin.disabled = false;
                btnLogin.textContent = textoOriginalBoton;
                return;
            }
 
            if (password.length < 6) {
                Swal.fire('Contraseña muy corta', 'Firebase exige que la contraseña tenga mínimo 6 caracteres.', 'warning');
                btnLogin.disabled = false;
                btnLogin.textContent = textoOriginalBoton;
                return;
            }
 
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    return userCredential.user.updateProfile({ displayName: username });
                })
                .then(async () => {
                    console.log("Registro y perfil actualizado correctamente.");
                    const usuarioFresco = firebase.auth().currentUser;
                    if (usuarioFresco) {
                        await usuarioFresco.reload();
                        miNombre = firebase.auth().currentUser.displayName || username;
                        
                        // Actualizamos la etiqueta de la interfaz de inmediato
                        if (labelMiNombre) labelMiNombre.textContent = `🟢 ${miNombre}`;
                        // Le avisamos al servidor de Sockets tu nombre real
                        socket.emit('nuevo_usuario', miNombre);
                    }
                })
                .catch((error) => {
                    btnLogin.disabled = false;
                    btnLogin.textContent = textoOriginalBoton;
 
                    if (error.code === 'auth/email-already-in-use') {
                        Swal.fire('Cuenta duplicada', 'Este correo ya está registrado. Intenta iniciar sesión.', 'error');
                    } else if (error.code === 'auth/invalid-email') {
                        Swal.fire('Correo inválido', 'Por favor escribe un correo con formato válido.', 'warning');
                    } else {
                        Swal.fire('Error de Registro', error.message, 'error');
                    }
                });
        }
    });
}

btnBajarChat.id = 'btn-bajar-chat';
btnBajarChat.innerHTML = '⬇';
btnBajarChat.type = 'button';
btnBajarChat.style.display = 'none';

if (form && contenedorChat) {
    form.insertBefore(btnBajarChat, form.querySelector('button[type="submit"]'));
   
    contenedorChat.addEventListener('scroll', () => {
        const distDesdeElFondo = contenedorChat.scrollHeight - contenedorChat.clientHeight - contenedorChat.scrollTop;
        if (distDesdeElFondo > 300) {
            btnBajarChat.style.display = 'flex';
        } else {
            btnBajarChat.style.display = 'none';
        }
    });
    
    btnBajarChat.addEventListener('click', () => {
        hacerScroll();
    });
}

// function hacerscroll
function hacerScroll() { 
    setTimeout(() => { 
        if (contenedorChat) {
            contenedorChat.scrollTop = contenedorChat.scrollHeight;
        }
    }, 10);
}


function entrarAlChat() {
    if (authScreen) authScreen.style.display = "none"; 
    if (appContainer) appContainer.style.display = "flex"; 
    
    if (labelMiNombre) labelMiNombre.textContent = `🟢 ${miNombre}`;
    
    if (sonidoNotificacion) {
        sonidoNotificacion.play().then(() => { 
            sonidoNotificacion.pause(); 
            sonidoNotificacion.currentTime = 0; 
        }).catch(e => {});
    }

    socket.emit('nuevo_usuario', miNombre);  
    cargarHistorial();
}

conversacionesWhatsApp.forEach(item => {
    item.addEventListener('click', () => {
        const canalSeleccionado = item.getAttribute('data-canal');
        if (canalSeleccionado === canalActual) return; 

        document.querySelector('.chat-item.activo').classList.remove('activo');
        item.classList.add('activo');

        canalActual = canalSeleccionado;
        
        if (txtCanalActual) {
            if(canalActual === 'general') txtCanalActual.textContent = "Grupo General";
            if(canalActual === 'archivos') txtCanalActual.textContent = "Repositorio Archivos";
            if(canalActual === '.') txtCanalActual.textContent = "Sala de Pruebas (.)";
        }
        
        const headerIcon = document.getElementById("header-group-icon");
        if(headerIcon) {
            if(canalActual === 'general') headerIcon.textContent = "👥";
            if(canalActual === 'archivos') headerIcon.textContent = "📁";
            if(canalActual === '.') headerIcon.textContent = "💬";
        }

        socket.emit('cambiar_canal', canalActual);
        cargarHistorial();
    });
});

// FUNCION CERRAR SESIÓN 
const btnLogout = document.getElementById('btn-logout'); 
if (btnLogout) { 
    btnLogout.addEventListener('click', () => {
        const appContainer = document.getElementById('app-container');
        if (appContainer) appContainer.classList.add('app-blur-effect');

        Swal.fire({
            title: '¿Terminaste por hoy?',
            text: "Tu sesión se cerrará de forma segura.",
            icon: 'warning',
            iconColor: 'var(--color-accent)', 
            showCancelButton: true,
            confirmButtonColor: 'var(--color-accent)',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Sí, salir ahora',
            cancelButtonText: 'Permanecer aquí',
            background: 'var(--bg-sidebar)', 
            color: 'var(--text-primary)',     
            showClass: {
                popup: 'animate__animated animate__zoomIn animate__faster' 
            },
            hideClass: {
                popup: 'animate__animated animate__zoomOut animate__faster' 
            }
        }).then((result) => {
            if (result.isConfirmed) { 
                Swal.fire({
                    title: 'Cerrando sesión...',
                    html: 'Guardando tus configuraciones de forma segura.',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    background: 'var(--bg-sidebar)',
                    color: 'var(--text-primary)',
                    willOpen: () => {
                        Swal.showLoading();
                    }
                });

                firebase.auth().signOut()
                .then(() => {
                    console.log("Sesión Cerrada"); 
                    window.location.reload();
                })
                .catch((error) => {
                    if (appContainer) appContainer.classList.remove('app-blur-effect');
                    Swal.fire('Error al cerrar sesión', error.message, 'error');
                });
            } else {
                if (appContainer) appContainer.classList.remove('app-blur-effect');
            }
        });
    });
}

// verificar si el usuario ya tenia una preferencia guardada anteriormente 
const temaGuardado = localStorage.getItem('tema-seleccionado') || 'light'; 

document.documentElement.setAttribute('data-theme', temaGuardado); 
if (btnToggleTema) btnToggleTema.textContent = temaGuardado === 'dark' ? '☀️' : '🌙';

if (btnToggleTema) { 
    btnToggleTema.addEventListener('click', () => { 
        const temaActual = document.documentElement.getAttribute('data-theme');
        let nuevoTema = 'light'; 

        if (temaActual === 'light') { 
            nuevoTema = 'dark'; 
            btnToggleTema.textContent =  '☀️';
        } else { 
            btnToggleTema.textContent = '🌙';
        }
    
    document.documentElement.setAttribute('data-theme', nuevoTema); 
    localStorage.setItem('tema-seleccionado', nuevoTema); 
    });
}

if (btnGoogleNav && googleSearchPanel && iframeGoogle) { 
    btnGoogleNav.addEventListener('click', async () => {
        const { value: query } = await Swal.fire({
            title: 'Buscador Web',
            input: 'text',
            inputLabel: '¿Qué deseas buscar en internet?',
            inputPlaceholder: 'Ingrese su búsqueda...',
            showCancelButton: true,
            confirmButtonColor: '#d4af37'
        });

        if (query && query.trim() !== '') {
            iframeGoogle.src = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;            
            
            googleSearchPanel.style.display = 'flex';

            const contenedorContenido = document.getElementById("chat-container");
            if (contenedorContenido) {
                contenedorContenido.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        }
    });
}
if (btnCerrarGoogle && googleSearchPanel) {
    btnCerrarGoogle.addEventListener('click', () => {
        googleSearchPanel.style.display = 'none'; 
        iframeGoogle.src = ''; 
    });
}



// FUNCION PARA GUARDAR UN MENSAJE. EN EL HISTORIAL 

function guardarEnHistorial(tipo, datos) { 
    if (!Array.isArray(historialMensajes)) {
        historialMensajes = [];
    }
    historialMensajes.push({tipo, datos});
}

// FUNCIÓN PARA RENDERIZAR MENSAJES
function renderizarMensaje(item) { 
    const div = document.createElement('div'); 
    div.classList.add('mensaje'); 

    if (item.tipo === 'sistema') { 
        div.classList.add('sistema'); 
        div.textContent = item.datos; 
    } else { 
        const data = item.datos; 
        if(data.usuario === miNombre) { 
            div.classList.add('propio');
        }

        let archivoHTML = ''; 
        if (data.archivo) { 
            if (data.archivo.type && data.archivo.type.startsWith('image/')) { 
                archivoHTML = `<div class="chat-img"><img src="${data.archivo.base64}" style="max-width: 200px; display:block; border-radius:8px; margin-top:5px;"/></div>`;
            } else if (data.archivo.name) { 
                archivoHTML = `<div class="chat-file"><a href="${data.archivo.base64}" download="${data.archivo.name}">📄 Descargar ${data.archivo.name}</a></div>`;
            }
        }

        div.innerHTML = `
            <span class="autor">${data.usuario}</span>
            ${data.texto ? `<p class="texto-msg">${data.texto}</p>` : ''}
            ${archivoHTML}
            <span class="hora">${data.hora || ''}</span>
        `;
    } 

    if (chatMensajes) { 
        chatMensajes.appendChild(div);
    }
}


// cargar los mensajes guardados apenas el usuario se loguea 

async function cargarHistorial() { 
    try { 
        const respuesta = await fetch(`/historial?canal=${canalActual}`); 
        
        if (!respuesta.ok) {
            throw new Error(`Error en el servidor: ${respuesta.status}`);
        }
        
        historialMensajes = await respuesta.json(); 

        // Limpiar únicamente las burbujas de texto
        const mensajesEnPantalla = document.querySelectorAll('.mensaje'); 
        mensajesEnPantalla.forEach(msg => msg.remove()); 
        
        if (Array.isArray(historialMensajes)) {
            historialMensajes.forEach(item => renderizarMensaje(item)); 
        }

        if (form) {
            form.style.setProperty('display', 'flex', 'important');
            form.style.visibility = 'visible';
            form.style.opacity = '1';
        }

        hacerScroll(); 
    } catch (error) { 
        console.error("Error al traer el historial de Firebase", error); 
        historialMensajes = []; 
    }
}

async function inicializarEmojis() {
    try {
        if (typeof EmojiMart !== 'undefined' && emojiContainer) {
            const picker = new EmojiMart.Picker({
                locale: 'es',
                set: 'native',
                onEmojiSelect: (emoji) => {
                    if (input) {
                        input.value += emoji.native;
                        input.focus();
                    }
                }
            });
            emojiContainer.appendChild(picker);
        }
    } catch (error) { console.error(error); }
}
// MOSTRAR OCULTAR EMOJIS 
document.addEventListener('DOMContentLoaded', () => { inicializarEmojis(); });


if (btnEmoji && emojiContainer) {
    btnEmoji.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        emojiContainer.style.display = emojiContainer.style.display === 'none' ? 'block' : 'none'; 
    });
}

// Cerrar el selector si se hace click afuera
document.addEventListener('click', () => { if (emojiContainer) emojiContainer.style.display = 'none'; });
if (emojiContainer) emojiContainer.addEventListener('click', (e) => e.stopPropagation());
if (btnAdjuntar && inputArchivo) btnAdjuntar.addEventListener('click', () => inputArchivo.click()); 

if (inputArchivo) {
    inputArchivo.addEventListener('change', () => {
        if(inputArchivo.files.length > 0 && btnAdjuntar) btnAdjuntar.style.background = '#00a884';
    });
}

if (form) {
    form.addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        let archivoData = null; 
        
        const file = inputArchivo.files ? inputArchivo.files[0] : null;
        if (file) { archivoData = await convertFileToBase64(file); }

        if (input.value.trim() !== '' || archivoData) {
            socket.emit('mensaje_chat', { 
                canal: canalActual,
                texto: input.value, 
                archivo: archivoData
            });     

            input.value = '';
            inputArchivo.value = ''; 
            if (btnAdjuntar) btnAdjuntar.style.background = '';
        }   
    });
}
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ name: file.name, type: file.type, base64: reader.result });
        reader.onerror = error => reject(error);
    });
}

// escribir los mensajes del chat 
socket.on('mensaje_chat', (res) => { 
    console.log("🔔 NOTIFICACIÓN RECIBIDA EN CLIENTE:", res);
    
    if (res && res.datos && res.datos.usuario !== miNombre) {
        const audio = document.getElementById("sonido-notificacion");
        if (audio) {
            audio.currentTime = 0; 
            audio.play().catch(e => {
                console.log(" El navegador bloqueó el autoplay (se requiere interacción previa):", e);
            });
        }
    }

    // 2. FILTRO VISUAL DE CANAL
    // Si el mensaje recibido pertenece a una sala en segundo plano, no lo pintamos en pantalla
    if (!res || res.canal !== canalActual) return; 

    //  RENDERIZADO EN PANTALLA
    const nuevoItem = { tipo: 'chat', datos: res.datos }; 
    guardarEnHistorial('chat', res.datos); 
    renderizarMensaje(nuevoItem); 
    hacerScroll();
});

// recibir notificaciones del sistema 
socket.on('mensaje_sistema', (res) => { 
    if (sonidoNotificacion) { 
        try { sonidoNotificacion.play().catch(e => {}); } catch(e) {}
    }

    if (res.canal !== canalActual) return; 
    const nuevoItem = {tipo: 'sistema', datos: res.msg}; 
    guardarEnHistorial('sistema', res.msg); 
    renderizarMensaje(nuevoItem); 
    hacerScroll();
});


// LOGICA DE BUSQUEDA 

if (inputBusqueda) {
    inputBusqueda.addEventListener('input', (e) => { 
        const textoBusqueda = e.target.value.toLowerCase().trim(); 

        
        const mensajesEnPantalla = document.querySelectorAll('.mensaje'); 
        mensajesEnPantalla.forEach(msg => msg.remove()); 

        // Si el buscador está vacío, mostramos todo el historial completo
        if (textoBusqueda === '') { 
            if (Array.isArray(historialMensajes)) {
                historialMensajes.forEach(item => renderizarMensaje(item)); 
            }
            hacerScroll(); 
            return;
        }

        // Filtrar el historial 
        const historialFiltrado = historialMensajes.filter(item => { 
            if (item.tipo === 'sistema') { 
                return item.datos.toLowerCase().includes(textoBusqueda); 
            } else { 
                const textoCoincide = item.datos.texto && item.datos.texto.toLowerCase().includes(textoBusqueda);
                const usuarioCoincide = item.datos.usuario && item.datos.usuario.toLowerCase().includes(textoBusqueda);
                const archivoCoincide = item.datos.archivo && item.datos.archivo.name && item.datos.archivo.name.toLowerCase().includes(textoBusqueda);
                return textoCoincide || usuarioCoincide || archivoCoincide;
            }
        }); 
        
        historialFiltrado.forEach(item => renderizarMensaje(item));
    });
}