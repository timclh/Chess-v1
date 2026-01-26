import React, { Component } from 'react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  isFirebaseConfigured
} from './firebase';

class Login extends Component {
  state = {
    isLogin: true,
    email: '',
    password: '',
    displayName: '',
    error: '',
    loading: false,
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    this.setState({ error: '', loading: true });

    const { isLogin, email, password, displayName } = this.state;

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          throw new Error('Please enter a display name');
        }
        await registerWithEmail(email, password);
        // Profile will be created by AuthContext
      }
      if (this.props.onSuccess) {
        this.props.onSuccess();
      }
    } catch (error) {
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already registered';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      }
      this.setState({ error: errorMessage });
    } finally {
      this.setState({ loading: false });
    }
  };

  handleGoogleLogin = async () => {
    this.setState({ error: '', loading: true });
    try {
      await loginWithGoogle();
      if (this.props.onSuccess) {
        this.props.onSuccess();
      }
    } catch (error) {
      this.setState({ error: error.message });
    } finally {
      this.setState({ loading: false });
    }
  };

  render() {
    const { isLogin, email, password, displayName, error, loading } = this.state;
    const configured = isFirebaseConfigured();

    if (!configured) {
      return (
        <div className="login-container">
          <div className="login-box">
            <h2>Cloud Saves Not Configured</h2>
            <div className="setup-instructions">
              <p>To enable cloud saves and login:</p>
              <ol>
                <li>Create a Firebase project at <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
                <li>Enable Authentication (Email/Password)</li>
                <li>Enable Firestore Database</li>
                <li>Add your config to <code>.env</code> file or <code>firebase.js</code></li>
              </ol>
              <p>Your game progress is currently saved locally in your browser.</p>
            </div>
            <button className="btn btn-secondary" onClick={this.props.onClose}>
              Continue with Local Storage
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="login-container">
        <div className="login-box">
          <h2>{isLogin ? 'Login' : 'Create Account'}</h2>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={this.handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => this.setState({ displayName: e.target.value })}
                  placeholder="Your name"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => this.setState({ email: e.target.value })}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => this.setState({ password: e.target.value })}
                placeholder="Password"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary login-btn"
              disabled={loading}
            >
              {loading ? 'Loading...' : (isLogin ? 'Login' : 'Create Account')}
            </button>
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          <button
            className="btn google-btn"
            onClick={this.handleGoogleLogin}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="login-switch">
            {isLogin ? (
              <p>
                Don't have an account?{' '}
                <button onClick={() => this.setState({ isLogin: false, error: '' })}>
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button onClick={() => this.setState({ isLogin: true, error: '' })}>
                  Login
                </button>
              </p>
            )}
          </div>

          <button className="btn btn-link close-btn" onClick={this.props.onClose}>
            Continue as Guest
          </button>
        </div>
      </div>
    );
  }
}

export default Login;
