import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  DocumentData,
  writeBatch,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MeetingSession, TranscriptEntry, AgentOutput } from '../types';

export class FirestoreService {
  // Meeting Sessions
  async createMeetingSession(session: Omit<MeetingSession, 'id'>): Promise<string> {
    const sessionData = {
      ...session,
      createdAt: Timestamp.fromDate(session.createdAt),
      updatedAt: Timestamp.fromDate(session.updatedAt)
    };
    
    const docRef = await addDoc(collection(db, 'meetings'), sessionData);
    return docRef.id;
  }

  async updateMeetingSession(sessionId: string, updates: Partial<MeetingSession>): Promise<void> {
    const sessionRef = doc(db, 'meetings', sessionId);
    const updateData: any = { ...updates };
    
    if (updates.updatedAt) {
      updateData.updatedAt = Timestamp.fromDate(updates.updatedAt);
    }
    
    await updateDoc(sessionRef, updateData);
  }

  async getMeetingSessions(userId: string): Promise<MeetingSession[]> {
    const q = query(
      collection(db, 'meetings'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    } as MeetingSession));
  }

  subscribeToMeetingSessions(userId: string, callback: (sessions: MeetingSession[]) => void): () => void {
    const q = query(
      collection(db, 'meetings'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      } as MeetingSession));
      callback(sessions);
    });
  }

  // Transcript Entries
  async addTranscriptEntry(entry: TranscriptEntry): Promise<void> {
    const entryData = {
      ...entry,
      timestamp: Timestamp.fromDate(entry.timestamp)
    };
    
    await addDoc(collection(db, 'transcripts'), entryData);
  }

  subscribeToTranscriptEntries(sessionId: string, callback: (entries: TranscriptEntry[]) => void): () => void {
    const q = query(
      collection(db, 'transcripts'),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      } as TranscriptEntry));
      callback(entries);
    });
  }

  // Agent Outputs
  async addAgentOutput(output: AgentOutput): Promise<void> {
    const outputData = {
      ...output,
      createdAt: Timestamp.fromDate(output.createdAt),
      provenance: {
        ...output.provenance,
        timestamp: Timestamp.fromDate(output.provenance.timestamp)
      }
    };
    
    await addDoc(collection(db, 'agentOutputs'), outputData);
  }

  // Stream agent output for real-time updates
  async streamAgentOutput(
    sessionId: string,
    agentType: string,
    provenance: any,
    onUpdate: (output: AgentOutput) => void
  ): Promise<string> {
    // Create initial document
    const output: Omit<AgentOutput, 'id'> = {
      sessionId,
      agentType: agentType as any,
      provenance: {
        ...provenance,
        outputs: {
          analysis: '',
          insights: [],
          confidence_score: 0,
          reasoning_chain: []
        }
      },
      createdAt: new Date()
    };

    const outputData = {
      ...output,
      createdAt: Timestamp.fromDate(output.createdAt),
      provenance: {
        ...output.provenance,
        timestamp: Timestamp.fromDate(output.provenance.timestamp)
      }
    };
    
    const docRef = await addDoc(collection(db, 'agentOutputs'), outputData);
    const docId = docRef.id;

    // Set up real-time listener for this specific document
    onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const updatedOutput: AgentOutput = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          provenance: {
            ...data.provenance,
            timestamp: data.provenance.timestamp.toDate()
          }
        } as AgentOutput;
        onUpdate(updatedOutput);
      }
    });

    return docId;
  }

  // Update streaming agent output
  async updateStreamingAgentOutput(
    outputId: string,
    updates: {
      analysis?: string;
      insights?: string[];
      confidence_score?: number;
      reasoning_chain?: string[];
    }
  ): Promise<void> {
    const outputRef = doc(db, 'agentOutputs', outputId);
    const updateData: any = {};

    if (updates.analysis !== undefined) {
      updateData['provenance.outputs.analysis'] = updates.analysis;
    }
    if (updates.insights !== undefined) {
      updateData['provenance.outputs.insights'] = updates.insights;
    }
    if (updates.confidence_score !== undefined) {
      updateData['provenance.outputs.confidence_score'] = updates.confidence_score;
      updateData['provenance.confidence'] = updates.confidence_score;
    }
    if (updates.reasoning_chain !== undefined) {
      updateData['provenance.outputs.reasoning_chain'] = updates.reasoning_chain;
    }

    await updateDoc(outputRef, updateData);
  }

  subscribeToAgentOutputs(sessionId: string, callback: (outputs: AgentOutput[]) => void): () => void {
    const q = query(
      collection(db, 'agentOutputs'),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const outputs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          provenance: {
            ...data.provenance,
            timestamp: data.provenance.timestamp.toDate()
          }
        } as AgentOutput;
      });
      callback(outputs);
    });
  }

  // Batch operations for performance
  async batchAddTranscriptEntries(entries: TranscriptEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const batch = writeBatch(db);
    const transcriptsRef = collection(db, 'transcripts');

    entries.forEach(entry => {
      const entryData = {
        ...entry,
        timestamp: Timestamp.fromDate(entry.timestamp)
      };
      const docRef = doc(transcriptsRef);
      batch.set(docRef, entryData);
    });

    await batch.commit();
  }

  // Get latest transcript entries with limit
  async getLatestTranscriptEntries(sessionId: string, limitCount: number = 10): Promise<TranscriptEntry[]> {
    const q = query(
      collection(db, 'transcripts'),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    } as TranscriptEntry)).reverse(); // Reverse to get chronological order
  }

  // Real-time performance monitoring
  subscribeToLatestAgentOutputs(sessionId: string, callback: (outputs: AgentOutput[]) => void, limitCount: number = 5): () => void {
    const q = query(
      collection(db, 'agentOutputs'),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    return onSnapshot(q, (snapshot) => {
      const outputs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          provenance: {
            ...data.provenance,
            timestamp: data.provenance.timestamp.toDate()
          }
        } as AgentOutput;
      });
      callback(outputs.reverse()); // Chronological order
    });
  }

  // Health check for real-time features
  async testConnection(): Promise<boolean> {
    try {
      const testQuery = query(collection(db, 'meetings'), limit(1));
      await getDocs(testQuery);
      return true;
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      return false;
    }
  }

  // Delete meeting and all related data
  async deleteMeetingSession(sessionId: string): Promise<void> {
    // Delete transcripts
    const transcriptsQuery = query(
      collection(db, 'transcripts'),
      where('sessionId', '==', sessionId)
    );
    const transcriptSnapshot = await getDocs(transcriptsQuery);
    const transcriptDeletePromises = transcriptSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // Delete agent outputs
    const outputsQuery = query(
      collection(db, 'agentOutputs'),
      where('sessionId', '==', sessionId)
    );
    const outputsSnapshot = await getDocs(outputsQuery);
    const outputDeletePromises = outputsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // Delete meeting
    const meetingDeletePromise = deleteDoc(doc(db, 'meetings', sessionId));

    await Promise.all([
      ...transcriptDeletePromises,
      ...outputDeletePromises,
      meetingDeletePromise
    ]);
  }
}

export const firestoreService = new FirestoreService();