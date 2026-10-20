/**
 * Chat safety UI shared by the room chat (Multiplayer) and the global chat:
 *  - MessageActions: Block / Report buttons for one message from another user
 *  - SafetyFooter:   visible contact line + list of blocked users with Unblock
 *
 * Labels are Chinese first, English second.
 */

import React, { Component } from 'react';
import { REPORT_REASONS } from '../services/ChatSafetyService';
import { SUPPORT_EMAIL } from '../LegalPages';

export class MessageActions extends Component {
  state = {
    reporting: false,
    reason: REPORT_REASONS[0].value,
    reported: false,
  };

  submitReport = () => {
    const { name, text, onReport } = this.props;
    onReport(name, text, this.state.reason);
    this.setState({ reporting: false, reported: true });
  };

  render() {
    const { name, onBlock } = this.props;
    const { reporting, reason, reported } = this.state;

    return (
      <div className="chat-msg-actions">
        <button
          type="button"
          className="chat-action-btn"
          onClick={() => onBlock(name)}
          title="屏蔽此用户 / Block this user"
        >
          屏蔽 Block
        </button>
        <button
          type="button"
          className="chat-action-btn"
          disabled={reported}
          onClick={() => this.setState({ reporting: !reporting })}
          title="举报此消息 / Report this message"
        >
          {reported ? '已举报 Reported' : '举报 Report'}
        </button>
        {reporting && (
          <div className="chat-report-form">
            <select
              value={reason}
              onChange={(e) => this.setState({ reason: e.target.value })}
              aria-label="举报原因 / Report reason"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button type="button" className="chat-action-btn" onClick={this.submitReport}>
              提交 Submit
            </button>
            <button
              type="button"
              className="chat-action-btn"
              onClick={() => this.setState({ reporting: false })}
            >
              取消 Cancel
            </button>
          </div>
        )}
      </div>
    );
  }
}

export const SafetyFooter = ({ blocked = [], onUnblock }) => (
  <div className="chat-safety">
    <div className="chat-safety-note">
      遇到不当内容请屏蔽或举报，也可联系 / Block or report abuse, or contact{' '}
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    </div>
    {blocked.length > 0 && (
      <details className="chat-blocked">
        <summary>已屏蔽 / Blocked ({blocked.length})</summary>
        <ul>
          {blocked.map((name) => (
            <li key={name}>
              <span>{name}</span>
              <button type="button" className="chat-action-btn" onClick={() => onUnblock(name)}>
                解除 Unblock
              </button>
            </li>
          ))}
        </ul>
      </details>
    )}
  </div>
);
