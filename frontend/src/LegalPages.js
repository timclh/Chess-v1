import React, { Component } from 'react';

export class PrivacyPolicy extends Component {
  render() {
    return (
      <div className="legal-page">
        <h2>Privacy Policy</h2>
        <p className="legal-updated">Last updated: February 27, 2026</p>

        <h3>1. Information We Collect</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li><strong>Account information:</strong> email address and display name</li>
          <li><strong>Game data:</strong> game results, ratings, puzzle completions, and streaks</li>
          <li><strong>Usage data:</strong> pages visited, features used, and session duration</li>
        </ul>
        <p>If you use the app without an account, all data is stored locally on your device and is never transmitted to our servers.</p>

        <h3>2. How We Use Your Information</h3>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain the app's functionality</li>
          <li>Track your game progress, ratings, and achievements</li>
          <li>Enable multiplayer features and leaderboards</li>
          <li>Improve the app experience</li>
        </ul>

        <h3>3. Data Storage</h3>
        <p>Account data is stored securely using Google Firebase (Firestore and Authentication). Local data is stored in your browser's localStorage. We do not sell or share your personal information with third parties.</p>

        <h3>4. Third-Party Services</h3>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Google Firebase:</strong> Authentication and data storage</li>
          <li><strong>YouTube:</strong> Embedded video tutorials (subject to Google's privacy policy)</li>
        </ul>

        <h3>5. Data Retention & Deletion</h3>
        <p>You can delete your account and all associated data at any time from your Profile page. Upon account deletion, all your data is permanently removed from our servers. Local data can be cleared through your browser settings.</p>

        <h3>6. Children's Privacy</h3>
        <p>棋 Arena is suitable for all ages. We do not knowingly collect information from children under 13 without parental consent. If you believe we have collected such information, please contact us.</p>

        <h3>7. Changes to This Policy</h3>
        <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>

        <h3>8. Contact Us</h3>
        <p>If you have questions about this privacy policy, please contact us at: <a href="mailto:support@chessarena.app">support@chessarena.app</a></p>
      </div>
    );
  }
}

export class TermsOfService extends Component {
  render() {
    return (
      <div className="legal-page">
        <h2>Terms of Service</h2>
        <p className="legal-updated">Last updated: February 27, 2026</p>

        <h3>1. Acceptance of Terms</h3>
        <p>By accessing or using 棋 Arena ("the App"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.</p>

        <h3>2. Description of Service</h3>
        <p>棋 Arena is a chess, Xiangqi (Chinese Chess), and Gomoku gaming application that provides:</p>
        <ul>
          <li>Single-player games against AI opponents</li>
          <li>Multiplayer online games</li>
          <li>Puzzles and training exercises</li>
          <li>AI coaching and game analysis</li>
          <li>Video tutorials and learning resources</li>
        </ul>

        <h3>3. User Accounts</h3>
        <p>You may use the App as a guest (local storage only) or create an account for cloud saves and multiplayer features. You are responsible for maintaining the confidentiality of your account credentials.</p>

        <h3>4. User Conduct</h3>
        <p>You agree not to:</p>
        <ul>
          <li>Use the App for any illegal purpose</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Use bots or automated tools in multiplayer games</li>
          <li>Attempt to exploit or hack the App</li>
          <li>Impersonate other users</li>
        </ul>

        <h3>5. Intellectual Property</h3>
        <p>The App and its original content, features, and functionality are owned by 棋 Arena and are protected by international copyright, trademark, and other intellectual property laws.</p>

        <h3>6. Termination</h3>
        <p>We may terminate or suspend your account at any time without notice if you violate these terms. You may delete your account at any time from your Profile page.</p>

        <h3>7. Disclaimer</h3>
        <p>The App is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service.</p>

        <h3>8. Limitation of Liability</h3>
        <p>In no event shall 棋 Arena be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.</p>

        <h3>9. Changes to Terms</h3>
        <p>We reserve the right to modify these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms.</p>

        <h3>10. Contact</h3>
        <p>For questions about these terms, contact us at: <a href="mailto:support@chessarena.app">support@chessarena.app</a></p>
      </div>
    );
  }
}
