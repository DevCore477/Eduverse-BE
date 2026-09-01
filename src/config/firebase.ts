import admin from "firebase-admin";

let firebaseInitialized = false;
let firebaseAuth: admin.auth.Auth | null = null;

try {
    if (!admin.apps.length) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

        if (!projectId || !clientEmail || !privateKey) {
            console.warn('⚠️  Firebase credentials not configured in config/firebase.ts');
            console.warn('   Firebase authentication will be disabled.');
            firebaseInitialized = false;
        } else {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            firebaseAuth = admin.auth();
            firebaseInitialized = true;
            console.log('✅ Firebase initialized successfully (config/firebase.ts)');
        }
    } else {
        firebaseAuth = admin.auth();
        firebaseInitialized = true;
    }
} catch (error) {
    console.error('❌ Firebase initialization failed (config/firebase.ts):', error);
    console.warn('   Continuing without Firebase. Some features may be disabled.');
    firebaseInitialized = false;
}

// Export auth with fallback
export { firebaseAuth };
export const isFirebaseAvailable = firebaseInitialized;
