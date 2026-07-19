import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";

function Patients() {
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const snapshot = await getDocs(collection(db, "pets"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPatients(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>🐶 My Patients</h2>

      <p>Total Patients: {patients.length}</p>

      {patients.map((pet) => (
        <div key={pet.id}>
          <h4>{pet.name}</h4>
          <p>{pet.breed}</p>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default Patients;