import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase'; // Ensure this path is correct
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'; // Firestore methods
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; // Storage methods

const TodoList = () => {
  const inputRef = useRef();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState([]);

  // Fetch tasks from Firestore on component mount
  useEffect(() => {
    const tasksCollectionRef = collection(db, 'tasks');
    const q = query(tasksCollectionRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setTasks(taskList);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const imagesCollectionRef = collection(db, 'images');
    const q = query(imagesCollectionRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const imageList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setImages(imageList);
    });

    return unsubscribe;
  }, []);

  const addTask = async () => {
    if (newTask.trim()) {
      try {
        // Add task to Firestore
        await addDoc(collection(db, 'tasks'), {
          text: newTask,
          done: false,
          createdAt: Date.now(),
        });
        setNewTask('');
      } catch (error) {
        console.error("Error adding task: ", error);
      }
    }
  };

  const toggleTask = async (id, currentStatus) => {
    const taskDocRef = doc(db, 'tasks', id);
    try {
      await updateDoc(taskDocRef, {
        done: !currentStatus,
      });
    } catch (error) {
      console.error("Error updating task: ", error);
    }
  };

  const deleteTask = async (id) => {
    const taskDocRef = doc(db, 'tasks', id);
    try {
      await deleteDoc(taskDocRef);
    } catch (error) {
      console.error("Error deleting task: ", error);
    }
  };

  const uploadImage = (e) => {
    const file = e.target.files[0];
    const storageRef = ref(storage, file.name); // Updated for Firebase v9+
    const uploadTask = uploadBytesResumable(storageRef, file); // Use resumable upload

    uploadTask.on('state_changed', snap => {
      const percent = (snap.bytesTransferred / snap.totalBytes) * 100;
      setProgress(percent);
    }, error => {
      console.error(error.message);
    }, async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref); // Get the download URL
      await addDoc(collection(db, 'images'), { // Add to Firestore
        url,
        createdAt: Date.now(),
      });
      setProgress(0);
      inputRef.current.value = '';
    });
  };

  return (
    <div>
      <h2>Todo List</h2>
      <input type="file" onChange={uploadImage} />
      <progress value={progress} max="100" ref={inputRef} />
      <div className="images-grid">
        {images && images.map((image) => (
          <img src={image.url} alt="" key={image.id} />
        ))}
      </div>
      <input
        type="text"
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        placeholder="New task"
      />
      <button onClick={addTask}>Add Task  hier </button>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
            {task.text}
            <button onClick={() => toggleTask(task.id, task.done)}>
              {task.done ? 'Undo' : 'Done'}
            </button>
            <button onClick={() => deleteTask(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;

