import admin from "firebase-admin";

class FirebaseService {
    private _auth: admin.auth.Auth | null = null;
    private _firestore: admin.firestore.Firestore | null = null;
    private _messaging: admin.messaging.Messaging | null = null;
    private initialized = false;
    private initializationError: Error | null = null;

    constructor() {
        // Lazy initialization - only initialize when actually needed
        this.tryInitialize();
    }

    private tryInitialize() {
        try {
            if (!admin.apps.length) {
                const projectId = process.env.FIREBASE_PROJECT_ID;
                const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
                const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

                if (!projectId || !clientEmail || !privateKey) {
                    console.warn('⚠️  Firebase credentials not configured. Firebase features will be disabled.');
                    this.initializationError = new Error('Firebase credentials not configured');
                    return;
                }

                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    }),
                });
                
                this._auth = admin.auth();
                this._firestore = admin.firestore();
                this._messaging = admin.messaging();
                this.initialized = true;
                console.log('✅ Firebase initialized successfully');
            } else {
                this._auth = admin.auth();
                this._firestore = admin.firestore();
                this._messaging = admin.messaging();
                this.initialized = true;
            }
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.initializationError = error as Error;
            this.initialized = false;
        }
    }

    public get auth(): admin.auth.Auth {
        if (!this.initialized || !this._auth) {
            throw new Error('Firebase is not initialized. Check your environment variables.');
        }
        return this._auth;
    }

    public get firestore(): admin.firestore.Firestore {
        if (!this.initialized || !this._firestore) {
            throw new Error('Firebase is not initialized. Check your environment variables.');
        }
        return this._firestore;
    }

    public get messaging(): admin.messaging.Messaging {
        if (!this.initialized || !this._messaging) {
            throw new Error('Firebase is not initialized. Check your environment variables.');
        }
        return this._messaging;
    }

    public get isAvailable(): boolean {
        return this.initialized && this.initializationError === null;
    }

    async verifyIdToken(token: string) {
        if (!token) throw new Error("Token not provided");
        
        if (!this.initialized || !this._auth) {
            throw new Error("Firebase is not initialized. Cannot verify token.");
        }
        
        try {
            return await this._auth.verifyIdToken(token);
        } catch (error: any) {
            // Handle specific Firebase errors gracefully
            if (error.code === 'auth/id-token-expired') {
                throw new Error("Token has expired. Please sign in again.");
            }
            if (error.code === 'auth/argument-error') {
                throw new Error("Invalid token format.");
            }
            console.error('Firebase token verification error:', error);
            throw new Error(`Token verification failed: ${error.message}`);
        }
    }

    getUserByUid(uid: string) {
        return this.auth.getUser(uid);
    }

    createUser(data: {
        email: string;
        password: string;
        displayName?: string;
    }) {
        return this.auth.createUser(data);
    }

    sendPushNotification(payload: {
        token: string;
        title: string;
        body: string;
        data?: Record<string, string>;
    }) {
        return this.messaging.send({
            token: payload.token,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data ?? {},
        });
    }

    async updatePasswordByEmail(payload: {
        email: string;
        password: string;
    }) {
        const user = await admin.auth().getUserByEmail(payload.email);

       await admin.auth().updateUser(user.uid, {
            password: payload.password,
        });
    }
}

export const firebaseService = new FirebaseService();
