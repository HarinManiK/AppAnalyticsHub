import { useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, DocumentReference } from 'firebase/firestore';
import { db } from './firebase';

export default function ResetData() {
  const [status, setStatus] = useState<string[]>([]);
  const [isNuking, setIsNuking] = useState(false);

  const log = (msg: string) => {
    setStatus(prev => [...prev, msg]);
  };

  const deleteSubcollection = async (parentRef: DocumentReference, subName: string) => {
    const snap = await getDocs(collection(parentRef, subName));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  };

  const deleteCollection = async (collectionName: string) => {
    log(`[${collectionName}] Scanning...`);
    const snap = await getDocs(collection(db, collectionName));
    if (snap.empty) return;
    
    for (const d of snap.docs) {
      if (collectionName === 'users') {
        await deleteSubcollection(d.ref, 'friends');
        await deleteSubcollection(d.ref, 'friend_requests');
      } else if (collectionName === 'mailboxes') {
        await deleteSubcollection(d.ref, 'messages');
      } else if (collectionName === 'analytics_users') {
        await deleteSubcollection(d.ref, 'daily');
      }
      await deleteDoc(d.ref);
    }
    log(`[${collectionName}] Wiped ${snap.docs.length} documents.`);
  };

  const handleReset = async () => {
    const confirmText = window.prompt("Type 'NUKE' to confirm total deletion of all users, analytics, and data:");
    if (confirmText !== 'NUKE') return;
    
    setIsNuking(true);
    setStatus(['Starting Nuke Sequence...']);
    
    try {
      await deleteCollection('users');
      await deleteCollection('analytics_users');
      await deleteCollection('mailboxes');
      await deleteCollection('metadata');
      
      log('[analytics] Resetting global stats...');
      await setDoc(doc(db, 'analytics', 'global_stats'), {
        totalTasks: 0,
        tasksAssignedOut: 0,
        tasksReceived: 0,
        tasksCreatedSelf: 0
      });

      log('[metadata] Resetting system friend codes to 1000...');
      await setDoc(doc(db, 'metadata', 'system'), {
        user_count: 0
      });

      log('✅ DATABASE SUCCESSFULLY WIPED.');
      log('Please uninstall/reinstall the Android App to start fresh.');
    } catch (err: any) {
      console.error(err);
      log(`❌ Error: ${err.message}`);
    } finally {
      setIsNuking(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ color: 'var(--accent-rose)', margin: 0, fontSize: '32px' }}>⚠️ FIREBASE NUKE ⚠️</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', marginTop: '16px' }}>
        This will permanently delete ALL data across ALL Firestore collections (Users, Analytics, Mailboxes, Metadata). The database will be completely reset to a blank state as if the app was just deployed.
      </p>
      
      <button 
        onClick={handleReset} 
        disabled={isNuking}
        style={{ 
          background: isNuking ? 'var(--bg-glass)' : 'var(--accent-rose)', 
          color: 'white', 
          padding: '16px 32px', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: isNuking ? 'not-allowed' : 'pointer',
          fontSize: '20px',
          fontWeight: 'bold',
          transition: 'all 0.2s',
          marginBottom: '24px'
        }}
      >
        {isNuking ? 'NUKING...' : 'NUKE ENTIRE DATABASE'}
      </button>

      {status.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', textAlign: 'left', fontFamily: 'monospace', color: 'var(--accent-emerald)', maxHeight: '300px', overflowY: 'auto' }}>
          {status.map((msg, i) => (
            <div key={i} style={{ color: msg.includes('❌') ? 'var(--accent-rose)' : 'inherit' }}>{msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}
