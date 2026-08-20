import { getDatabase } from "./mongodb"

export async function getUsersCollection() {
    const db = await getDatabase()
    return db.collection("users")
}

export async function getEmergenciesCollection() {
    const db = await getDatabase()
    return db.collection("emergencies")
}

export async function getMessagesCollection() {
    const db = await getDatabase()
    return db.collection("messages")
}

export async function getPasswordResetsCollection() {
    const db = await getDatabase()
    return db.collection("passwordResets")
}