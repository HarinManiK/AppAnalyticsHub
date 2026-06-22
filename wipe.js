import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCiOsIhTy42A15FA7P6jw352bQLgf9bAf8",
  authDomain: "taskmanager-3a2b8.firebaseapp.com",
  projectId: "taskmanager-3a2b8",
  storageBucket: "taskmanager-3a2b8.firebasestorage.app",
  messagingSenderId: "409285347899",
  appId: "1:409285347899:web:placeholder"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipeData() {
  console.log("Starting Firebase Wipe...");

  try {
    // 1. Reset Global Stats
    await setDoc(doc(db, "analytics", "global_stats"), {
      totalTasks: 0,
      tasksAssignedOut: 0,
      tasksReceived: 0,
      tasksCreatedSelf: 0
    });
    console.log("Global stats reset.");

    // 2. Fetch all users
    const usersSnap = await getDocs(collection(db, "analytics_users"));
    
    for (const userDoc of usersSnap.docs) {
      await setDoc(doc(db, "analytics_users", userDoc.id), {
        totalTasks: 0,
        tasksAssignedOut: 0,
        tasksReceived: 0,
        tasksCreatedSelf: 0,
        sttAudioSeconds: 0,
        ttsCharacters: 0,
        openRouterTokens: 0
      }, { merge: true });

      const dailySnap = await getDocs(collection(db, "analytics_users", userDoc.id, "daily"));
      for (const dailyDoc of dailySnap.docs) {
        await deleteDoc(doc(db, "analytics_users", userDoc.id, "daily", dailyDoc.id));
      }
      console.log(`Reset user: ${userDoc.id}`);
    }

    console.log("Successfully wiped all data! Quitting...");
    process.exit(0);
  } catch (err) {
    console.error("Error wiping data:", err);
    process.exit(1);
  }
}

wipeData();
