import 'firebase/auth';
import firebase from 'firebase/app';
import { firebaseConfig } from './config';

const valid = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId;

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (e) {
  console.log(e);
}
const firebaseAuth = firebase.auth;
class FirebaseHelper {
  isValid = valid;
  EMAIL = 'email';
  FACEBOOK = 'facebook';
  GOOGLE = 'google';
  GITHUB = 'github';
  TWITTER = 'twitter';
  constructor() {
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
  }
  signup(info) {
    return firebaseAuth()
      .createUserWithEmailAndPassword(info.email, info.password)
      .catch((error) => {
        // Handle Errors here.
        var errorMessage = error.message;
        throw new Error(errorMessage);
      });
  }
  login(provider, info) {
    switch (provider) {
      case this.EMAIL:
        return firebaseAuth().signInWithEmailAndPassword(
          info.email,
          info.password,
        );
      case this.FACEBOOK:
        return firebaseAuth().FacebookAuthProvider();
      case this.GOOGLE:
        return firebaseAuth().GoogleAuthProvider();
      case this.GITHUB:
        return firebaseAuth().GithubAuthProvider();
      case this.TWITTER:
        return firebaseAuth().TwitterAuthProvider();
      default:
    }
  }
  logout() {
    return firebaseAuth().signOut();
  }
  updateUser() {
    var user = firebaseAuth().currentUser;

    user
      .updateProfile({
        displayName: 'Jane Q. User',
        photoURL: 'https://example.com/jane-q-user/profile.jpg',
      })
      .then(function() {
        // Update successful.
      })
      .catch(function(error) {
        // An error happened.
        console.log('An error happened.', error);
      });
  }
  isAuthenticated() {
    firebaseAuth().onAuthStateChanged((user) => {
      return user ? true : false;
    });
  }

  async resetPassword(email) {
    return await firebaseAuth().sendPasswordResetEmail(email);
  }

  async updatePassword(password) {
    return await firebaseAuth().currentUser.updatePassword(password);
  }
}

export default new FirebaseHelper();
