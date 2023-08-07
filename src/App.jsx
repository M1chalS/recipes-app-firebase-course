import './App.css';

import {useState} from "react";
import LoginForm from "./components/LoginForm.jsx";
import { onAuthStateChanged } from "firebase/auth";
import {auth} from "./FirebaseConfig.js";

export default function App() {
    const [user, setUser] = useState(null);

    onAuthStateChanged(auth, setUser);

    return (
        <div className="App">
            <div className="title-row">
                <h1 className="title">Firebase recipes</h1>
                <LoginForm existingUser={user}/>
            </div>
        </div>
    )
}