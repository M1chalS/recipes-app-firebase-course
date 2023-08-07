import {useState} from "react";
import {signInWithEmailAndPassword , signOut, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider} from "firebase/auth";
import {auth} from "../FirebaseConfig.js";

export default function LoginForm({existingUser}) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            await signInWithEmailAndPassword(auth, username, password)
            setUsername("");
            setPassword("");
        } catch (error) {
            alert(error.message);
        }
    }

    const handleLogout = () => {
        signOut(auth);
    }

    const handleSendResetPasswordEmail = async () => {
        if(!username) {
            alert("Please enter your email address")
            return;
        }

        try {
            await sendPasswordResetEmail(auth, username);
            alert("Password reset email sent");
        } catch (e) {
            alert(e.message);
        }
    }

    const handleLoginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (error) {
            alert(error.message);
        }
    }

    return (
        <div className="login-form-container">
            {existingUser ? <div className="row">
                <h3>Welcome, {existingUser.email}</h3>
                <button type="button" className="primary-button" onClick={handleLogout}>Logout</button>
            </div> : <form onSubmit={handleSubmit} className="login-form">
                <label className="input-label login-label">Username (email):
                    <input type="email" required value={username} onChange={(event) => setUsername(event.target.value)}
                           className="input-text"/>
                </label>
                <label className="input-label login-label">Password:
                    <input type="password" required value={password}
                           onChange={(event) => setPassword(event.target.value)} className="input-text"/>
                </label>
                <div className="button-box">
                    <button type="submit" className="primary-button">Register</button>
                    <button type="button" className="primary-button" onClick={handleSendResetPasswordEmail}>Reset Password</button>
                    <button type="button" className="primary-button" onClick={handleLoginWithGoogle}>Login with Google</button>
                </div>
            </form>}
        </div>
    );
}