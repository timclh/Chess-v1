/**
 * ProfilePage Component
 *
 * User profile with:
 * - Activity feed
 * - Friends list
 * - Notification preferences
 * - Share game challenge
 * - Stats overview
 */

import React, { Component } from 'react';
import {
  getActivity,
  getFriends,
  addFriend,
  removeFriend,
  formatActivity,
  createChallenge,
  getPendingChallenges,
} from './services/SocialService';
import {
  isSupported as notifSupported,
  getPermission,
  requestPermission,
  getNotificationPrefs,
  updateNotificationPrefs,
} from './services/NotificationService';
import { getRating } from './services/UserRatingService';
import { deleteAccount, isFirebaseConfigured } from './firebase';
import { GAME_TYPE } from './constants';

class ProfilePage extends Component {
  state = {
    activeTab: 'activity',
    // Activity
    activities: [],
    // Friends
    friends: [],
    friendInput: '',
    friendMessage: null,
    // Notifications
    notifPrefs: getNotificationPrefs(),
    notifPermission: getPermission(),
    // Challenge
    challengeUrl: null,
    challengeGameType: 'chess',
    // Account
    showDeleteConfirm: false,
    deletePassword: '',
    deleteError: '',
    deleteLoading: false,
    // Stats
    chessRating: 1200,
    xiangqiRating: 1200,
    wuziqiRating: 1200,
  };

  componentDidMount() {
    this.loadData();
  }

  loadData() {
    this.setState({
      activities: getActivity(20),
      friends: getFriends(),
      chessRating: getRating(GAME_TYPE.CHESS).rating || 1200,
      xiangqiRating: getRating(GAME_TYPE.XIANGQI).rating || 1200,
      wuziqiRating: getRating(GAME_TYPE.WUZIQI).rating || 1200,
      notifPermission: getPermission(),
    });
  }

  // ─── Friends ──────────────────────────────────────────────

  handleAddFriend = () => {
    const { friendInput } = this.state;
    if (!friendInput.trim()) return;
    const result = addFriend(friendInput.trim(), friendInput.trim());
    if (result.success) {
      this.setState({
        friends: getFriends(),
        friendInput: '',
        friendMessage: { type: 'success', text: `Added ${friendInput}!` },
        activities: getActivity(20),
      });
    } else {
      this.setState({
        friendMessage: { type: 'error', text: 'Already in friends list' },
      });
    }
    setTimeout(() => this.setState({ friendMessage: null }), 3000);
  };

  handleRemoveFriend = (friendId) => {
    removeFriend(friendId);
    this.setState({ friends: getFriends() });
  };

  // ─── Notifications ───────────────────────────────────────

  handleEnableNotifications = async () => {
    const perm = await requestPermission();
    if (perm === 'granted') {
      const prefs = updateNotificationPrefs({ enabled: true });
      this.setState({ notifPermission: perm, notifPrefs: prefs });
    } else {
      this.setState({ notifPermission: perm });
    }
  };

  handleToggleNotifPref = (key) => {
    const prefs = updateNotificationPrefs({
      [key]: !this.state.notifPrefs[key],
    });
    this.setState({ notifPrefs: prefs });
  };

  // ─── Challenge ────────────────────────────────────────────

  handleCreateChallenge = () => {
    const { challenge, url } = createChallenge({
      gameType: this.state.challengeGameType,
    });
    this.setState({ challengeUrl: url });

    // Copy to clipboard
    navigator.clipboard.writeText(url).catch(() => {});
  };

  // ─── Account ──────────────────────────────────────────────

  handleDeleteAccount = async () => {
    const { deletePassword } = this.state;
    this.setState({ deleteError: '', deleteLoading: true });
    try {
      await deleteAccount(deletePassword || null);
      // Clear all local data
      localStorage.clear();
      window.location.hash = '/';
      window.location.reload();
    } catch (error) {
      let msg = error.message;
      if (error.code === 'auth/wrong-password') {
        msg = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/requires-recent-login') {
        msg = 'Please log out and log back in, then try again.';
      }
      this.setState({ deleteError: msg, deleteLoading: false });
    }
  };

  // ─── Render ───────────────────────────────────────────────

  renderActivity() {
    const { activities } = this.state;
    if (activities.length === 0) {
      return <p className="social-empty">No activity yet. Play some games!</p>;
    }
    return (
      <div className="activity-feed">
        {activities.map((a) => {
          const { emoji, text, time } = formatActivity(a);
          return (
            <div key={a.id} className="activity-item">
              <span className="activity-emoji">{emoji}</span>
              <span className="activity-text">{text}</span>
              <span className="activity-time">{time}</span>
            </div>
          );
        })}
      </div>
    );
  }

  renderFriends() {
    const { friends, friendInput, friendMessage } = this.state;
    return (
      <div className="friends-section">
        <div className="friend-add">
          <input
            type="text"
            value={friendInput}
            onChange={(e) => this.setState({ friendInput: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && this.handleAddFriend()}
            placeholder="Add friend by name/ID..."
            className="friend-input"
          />
          <button className="friend-add-btn" onClick={this.handleAddFriend}>Add</button>
        </div>
        {friendMessage && (
          <div className={`friend-msg ${friendMessage.type}`}>{friendMessage.text}</div>
        )}
        {friends.length === 0 ? (
          <p className="social-empty">No friends added yet.</p>
        ) : (
          <div className="friends-list">
            {friends.map((f) => (
              <div key={f.id} className="friend-item">
                <span className="friend-name">👤 {f.displayName}</span>
                <span className="friend-added">Added {new Date(f.addedAt).toLocaleDateString()}</span>
                <button className="friend-remove" onClick={() => this.handleRemoveFriend(f.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  renderNotifications() {
    const { notifPrefs, notifPermission } = this.state;
    const supported = notifSupported();

    if (!supported) {
      return <p className="social-empty">Notifications are not supported in this browser.</p>;
    }

    if (notifPermission === 'denied') {
      return <p className="social-empty">Notifications are blocked. Please enable them in your browser settings.</p>;
    }

    if (!notifPrefs.enabled || notifPermission !== 'granted') {
      return (
        <div className="notif-enable">
          <p>Enable notifications to receive:</p>
          <ul className="notif-list">
            <li>🧩 Daily puzzle reminders</li>
            <li>🔥 Streak reminders</li>
            <li>⚔️ Game invitations</li>
          </ul>
          <button className="notif-enable-btn" onClick={this.handleEnableNotifications}>
            🔔 Enable Notifications
          </button>
        </div>
      );
    }

    return (
      <div className="notif-settings">
        <label className="notif-toggle">
          <input
            type="checkbox"
            checked={notifPrefs.dailyPuzzle}
            onChange={() => this.handleToggleNotifPref('dailyPuzzle')}
          />
          <span>🧩 Daily puzzle reminder</span>
        </label>
        <label className="notif-toggle">
          <input
            type="checkbox"
            checked={notifPrefs.streakReminder}
            onChange={() => this.handleToggleNotifPref('streakReminder')}
          />
          <span>🔥 Streak reminder</span>
        </label>
        <label className="notif-toggle">
          <input
            type="checkbox"
            checked={notifPrefs.gameInvites}
            onChange={() => this.handleToggleNotifPref('gameInvites')}
          />
          <span>⚔️ Game invitations</span>
        </label>
        <button
          className="notif-disable-btn"
          onClick={() => {
            const prefs = updateNotificationPrefs({ enabled: false });
            this.setState({ notifPrefs: prefs });
          }}
        >
          Disable All
        </button>
      </div>
    );
  }

  renderChallenge() {
    const { challengeUrl, challengeGameType } = this.state;
    return (
      <div className="challenge-section">
        <p>Create a challenge link to invite someone to play:</p>
        <div className="challenge-options">
          <select
            className="challenge-select"
            value={challengeGameType}
            onChange={(e) => this.setState({ challengeGameType: e.target.value })}
          >
            <option value="chess">♟ Chess</option>
            <option value="xiangqi">象棋 Xiangqi</option>
          </select>
          <button className="challenge-create-btn" onClick={this.handleCreateChallenge}>
            ⚔️ Create Challenge
          </button>
        </div>
        {challengeUrl && (
          <div className="challenge-link">
            <input type="text" readOnly value={challengeUrl} className="challenge-url" />
            <span className="challenge-copied">Link copied!</span>
          </div>
        )}
      </div>
    );
  }

  renderAccount() {
    const { showDeleteConfirm, deletePassword, deleteError, deleteLoading } = this.state;
    const { user } = this.props;
    const configured = isFirebaseConfigured();
    const isEmailUser = user?.providerData?.[0]?.providerId === 'password';

    return (
      <div className="account-settings">
        {user && configured ? (
          <>
            <div className="account-action-btn" style={{ cursor: 'default' }}>
              <span>📧</span>
              <span>{user.email}</span>
            </div>

            <button
              className="account-action-btn"
              onClick={() => window.location.hash = '/privacy'}
            >
              <span>🔒</span>
              <span>Privacy Policy</span>
            </button>

            <button
              className="account-action-btn"
              onClick={() => window.location.hash = '/terms'}
            >
              <span>📄</span>
              <span>Terms of Service</span>
            </button>

            <button
              className="account-action-btn danger"
              onClick={() => this.setState({ showDeleteConfirm: !showDeleteConfirm })}
            >
              <span>🗑️</span>
              <span>Delete Account</span>
            </button>

            {showDeleteConfirm && (
              <div className="delete-confirm-dialog">
                <p>⚠️ This will permanently delete your account and all data. This cannot be undone.</p>
                {isEmailUser && (
                  <div className="form-group">
                    <label>Confirm your password</label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => this.setState({ deletePassword: e.target.value })}
                      placeholder="Enter your password"
                    />
                  </div>
                )}
                {deleteError && <div className="login-error">{deleteError}</div>}
                <div className="delete-confirm-actions">
                  <button
                    className="btn-danger"
                    onClick={this.handleDeleteAccount}
                    disabled={deleteLoading || (isEmailUser && !deletePassword)}
                  >
                    {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                  </button>
                  <button
                    className="btn-cancel"
                    onClick={() => this.setState({ showDeleteConfirm: false, deleteError: '' })}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="social-empty">
              {configured ? 'Log in to manage your account.' : 'Account management requires Firebase configuration.'}
            </p>

            <button
              className="account-action-btn"
              onClick={() => window.location.hash = '/privacy'}
            >
              <span>🔒</span>
              <span>Privacy Policy</span>
            </button>

            <button
              className="account-action-btn"
              onClick={() => window.location.hash = '/terms'}
            >
              <span>📄</span>
              <span>Terms of Service</span>
            </button>
          </>
        )}
      </div>
    );
  }

  render() {
    const { activeTab, chessRating, xiangqiRating, wuziqiRating } = this.state;

    return (
      <div className="profile-page">
        <div className="profile-header">
          <h2>👤 Profile & Social</h2>
          <div className="profile-ratings">
            <span className="profile-rating">♟ Chess: {chessRating}</span>
            <span className="profile-rating">象棋 Xiangqi: {xiangqiRating}</span>
            <span className="profile-rating">⚫ Gomoku: {wuziqiRating}</span>
          </div>
        </div>

        <div className="profile-tabs">
          {['activity', 'friends', 'notifications', 'challenge', 'account'].map((tab) => (
            <button
              key={tab}
              className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => this.setState({ activeTab: tab })}
            >
              {tab === 'activity' && '📊 Activity'}
              {tab === 'friends' && '👥 Friends'}
              {tab === 'notifications' && '🔔 Notifications'}
              {tab === 'challenge' && '⚔️ Challenge'}
              {tab === 'account' && '⚙️ Account'}
            </button>
          ))}
        </div>

        <div className="profile-content">
          {activeTab === 'activity' && this.renderActivity()}
          {activeTab === 'friends' && this.renderFriends()}
          {activeTab === 'notifications' && this.renderNotifications()}
          {activeTab === 'challenge' && this.renderChallenge()}
          {activeTab === 'account' && this.renderAccount()}
        </div>
      </div>
    );
  }
}

export default ProfilePage;
