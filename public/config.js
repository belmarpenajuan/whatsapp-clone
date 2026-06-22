const firebaseConfig = {
    apiKey: (typeof process !== 'undefined' && process.env.FIREBASE_API_KEY) || "AIzaSyD6DpcPWdYbRWsgLHfcpy6kNuYXeL6SZUU",
    authDomain: "whatsapp-2-53dcf.firebaseapp.com",
    projectId: "whatsapp-2-53dcf",
    storageBucket: "whatsapp-2-53dcf.firebasestorage.app",
    messagingSenderId: "902728389072",
    appId: "1:902728389072:web:75dff0fd2db5cc463de9d5",
    measurementId: "G-N6GZFT0M6X"
};
  firebase.initializeApp(firebaseConfig);
