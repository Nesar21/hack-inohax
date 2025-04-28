// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getDatabase, ref, set, push, onChildAdded, onChildChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// This will hold the messages already displayed, keyed by message ID
const displayedMessages = new Set();

// Function to display messages in real-time without duplicates
function displayMessages() {
    const messageList = document.getElementById('message-list');

    // Listen for any new messages across all users
    const usersRef = ref(database, 'users');
    onChildAdded(usersRef, (userSnapshot) => {
        userSnapshot.child('messages').forEach((messageSnapshot) => {
            const messageData = messageSnapshot.val();
            appendMessage(messageSnapshot.key, messageData);
        });
    });

    // Listen for changes in the 'messages' node (in case a message is added after initial loading)
    onChildChanged(usersRef, (userSnapshot) => {
        userSnapshot.child('messages').forEach((messageSnapshot) => {
            const messageData = messageSnapshot.val();
            appendMessage(messageSnapshot.key, messageData);
        });
    });
}

// Function to create and append message elements without showing email
function appendMessage(messageId, messageData) {
    if (displayedMessages.has(messageId)) {
        return;
    }
    displayedMessages.add(messageId);

    const messageList = document.getElementById('message-list');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.innerHTML = `Message: ${messageData.message}<br><small>${messageData.timestamp}</small>`;
    messageList.appendChild(messageDiv);
}

// Sign Up Function
function signup() {
    const email = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;

    if (password.length < 8) {
        alert("Password must be at least 8 characters long.");
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            const user = userCredential.user;
            sendEmailVerification(user).then(() => {
                alert("Verification email sent! Please check your inbox.");
            }).catch(error => {
                console.error("Error sending verification email:", error.message);
            });

            set(ref(database, 'users/' + user.uid), {
                email: email,
                userId: user.uid,
                verified: false
            });
        })
        .catch(error => {
            console.error("Error during sign-up:", error.message);
            alert("Error: " + error.message);
        });
}

// Sign In Function
function signin() {
    const email = document.getElementById('signinUsername').value;
    const password = document.getElementById('signinPassword').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            const user = userCredential.user;

            if (!user.emailVerified) {
                alert("Please verify your email address first.");
                return;
            }

            alert("You have successfully signed in!");
        })
        .catch(error => {
            console.error("Error signing in:", error.message);
            alert("Sign-in failed. Check your email and password.");
        });
}

// Post Message Function
function postMessage() {
    const user = auth.currentUser;

    if (!user) {
        alert("You must be signed in to post a message.");
        return;
    }

    const message = document.getElementById('send-msg').value.trim();
    if (!message) {
        alert("Please enter a message before posting.");
        return;
    }

    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);

    set(newMessageRef, {
        message: message,
        timestamp: new Date().toLocaleString(),
        userId: user.uid
    })
    .then(() => {
        alert("Message posted successfully!");
        document.getElementById('send-msg').value = "";
    })
    .catch(error => {
        console.error("Error posting message:", error);
        alert("Error posting message. Please try again.");
    });
}

// Forgot Password Function
function forgotPassword() {
    const email = document.getElementById('resetEmail').value;
    if (email) {
        sendPasswordResetEmail(auth, email)
            .then(() => {
                alert("Password reset email sent! Please check your inbox.");
            })
            .catch((error) => {
                console.error("Error sending reset email:", error.message);
                alert("Error: " + error.message);
            });
    } else {
        alert("Please enter your email.");
    }
}

// Sign Out Function
function signOutUser() {
    signOut(auth).then(() => {
        alert("You have been signed out.");
    }).catch(error => {
        console.error("Error signing out:", error.message);
        alert("Error signing out.");
    });
}

// Real-time message display with anonymity
onAuthStateChanged(auth, user => {
    if (user) {
        document.getElementById('signoutButton').style.display = "block";

        const messagesRef = ref(database, 'messages');
        onChildAdded(messagesRef, snapshot => {
            const messageData = snapshot.val();
            if (!displayedMessages.has(snapshot.key)) {
                displayedMessages.add(snapshot.key);
                const messageList = document.getElementById('message-list');
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message');
                messageDiv.innerHTML = `Message: ${messageData.message}<br><span>${new Date(messageData.timestamp).toLocaleString()}</span>`;
                messageList.appendChild(messageDiv);
            }
        });

        if (user.emailVerified) {
            const userRef = ref(database, 'users/' + user.uid);
            set(userRef, {
                email: user.email,
                userId: user.uid,
                verified: true
            })
            .then(() => {
                console.log('Verified status updated in the database.');
            })
            .catch((error) => {
                console.error('Error updating verified status:', error.message);
            });
        } else {
            alert("Please verify your email first.");
            signOut(auth);
        }
    } else {
        document.getElementById('signoutButton').style.display = "none";
    }
});

// Add event listeners for buttons
document.getElementById('signupButton').addEventListener('click', signup);
document.getElementById('signinButton').addEventListener('click', signin);
document.getElementById('resetPasswordButton').addEventListener('click', forgotPassword);
document.getElementById('postMessageButton').addEventListener('click', postMessage);
document.getElementById('signoutButton').addEventListener('click', signOutUser);

// Initialize message display on page load
displayMessages();
