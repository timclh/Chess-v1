/**
 * Video Learning Component
 * Displays curated YouTube videos for chess training
 */

import React, { Component } from 'react';
import { VIDEO_LIBRARY, getVideosByTopic, searchVideos, getTopics } from './data/VideoLibrary';
import './VideoLearning.css';

class VideoLearning extends Component {
  state = {
    gameType: 'chess', // 'chess' or 'xiangqi'
    currentTopic: 'openings',
    currentLevel: 'beginner',
    selectedVideo: null,
    searchQuery: '',
    searchResults: null,
  };

  handleTopicChange = (topic) => {
    this.setState({ currentTopic: topic, selectedVideo: null, searchResults: null });
  };

  handleLevelChange = (level) => {
    this.setState({ currentLevel: level, selectedVideo: null });
  };

  handleGameTypeChange = (gameType) => {
    const topics = getTopics(gameType);
    this.setState({ 
      gameType, 
      currentTopic: topics[0] || 'basics',
      selectedVideo: null,
      searchResults: null,
    });
  };

  handleVideoSelect = (video) => {
    this.setState({ selectedVideo: video });
  };

  handleSearch = (e) => {
    e.preventDefault();
    const { searchQuery } = this.state;
    if (searchQuery.trim()) {
      const results = searchVideos(searchQuery);
      this.setState({ searchResults: results });
    } else {
      this.setState({ searchResults: null });
    }
  };

  clearSearch = () => {
    this.setState({ searchQuery: '', searchResults: null });
  };

  getVideos = () => {
    const { gameType, currentTopic, currentLevel, searchResults } = this.state;
    
    if (searchResults !== null) {
      return searchResults;
    }

    return getVideosByTopic(gameType, currentTopic, currentLevel);
  };

  render() {
    const { gameType, currentTopic, currentLevel, selectedVideo, searchQuery, searchResults } = this.state;
    const videos = this.getVideos();
    const topics = getTopics(gameType);

    return (
      <div className="video-learning">
        {/* Header */}
        <div className="learning-header">
          <h2>📺 Video Library / 视频教程</h2>
          <p>Learn from the best chess teachers on YouTube</p>
        </div>

        {/* Game Type Toggle */}
        <div className="game-type-toggle">
          <button
            className={gameType === 'chess' ? 'active' : ''}
            onClick={() => this.handleGameTypeChange('chess')}
          >
            ♟️ Chess
          </button>
          <button
            className={gameType === 'xiangqi' ? 'active' : ''}
            onClick={() => this.handleGameTypeChange('xiangqi')}
          >
            🏯 象棋
          </button>
        </div>

        {/* Search */}
        <form className="video-search" onSubmit={this.handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => this.setState({ searchQuery: e.target.value })}
            placeholder="Search videos... 搜索视频..."
          />
          <button type="submit">🔍</button>
          {searchResults !== null && (
            <button type="button" className="clear-btn" onClick={this.clearSearch}>
              ✕ Clear
            </button>
          )}
        </form>

        <div className="learning-content">
          {/* Sidebar - Topics */}
          <div className="topics-sidebar">
            <h3>Topics / 主题</h3>
            <div className="topics-list">
              {topics.map(topic => (
                <button
                  key={topic}
                  className={`topic-btn ${currentTopic === topic ? 'active' : ''}`}
                  onClick={() => this.handleTopicChange(topic)}
                >
                  {topic === 'openings' && '📖 '}
                  {topic === 'tactics' && '⚔️ '}
                  {topic === 'endgame' && '🏁 '}
                  {topic === 'strategy' && '🧠 '}
                  {topic === 'basics' && '📚 '}
                  {topic.charAt(0).toUpperCase() + topic.slice(1)}
                </button>
              ))}
            </div>

            {/* Level Filter */}
            {gameType === 'chess' && !searchResults && (
              <div className="level-filter">
                <h4>Level / 水平</h4>
                <div className="level-buttons">
                  {['beginner', 'intermediate', 'advanced'].map(level => (
                    <button
                      key={level}
                      className={`level-btn ${currentLevel === level ? 'active' : ''}`}
                      onClick={() => this.handleLevelChange(level)}
                    >
                      {level === 'beginner' && '🌱'}
                      {level === 'intermediate' && '🌿'}
                      {level === 'advanced' && '🌳'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Video Grid or Player */}
          <div className="videos-main">
            {selectedVideo ? (
              /* Video Player */
              <div className="video-player-container">
                <button className="back-btn" onClick={() => this.setState({ selectedVideo: null })}>
                  ← Back to list
                </button>
                <div className="video-player">
                  <iframe
                    src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}`}
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="video-details">
                  <h3>{selectedVideo.title}</h3>
                  <p className="title-cn">{selectedVideo.titleCn}</p>
                  <p className="channel">📺 {selectedVideo.channel}</p>
                  <p className="duration">⏱️ {selectedVideo.duration} min</p>
                  <p className="description">{selectedVideo.description}</p>
                  <div className="topics-tags">
                    {selectedVideo.topics.map(topic => (
                      <span key={topic} className="tag">{topic}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Video Grid */
              <div className="video-grid">
                {searchResults !== null && (
                  <div className="search-info">
                    Found {searchResults.length} videos for "{searchQuery}"
                  </div>
                )}
                {videos.length === 0 ? (
                  <div className="no-videos">
                    <p>No videos found / 暂无视频</p>
                  </div>
                ) : (
                  videos.map(video => (
                    <div
                      key={video.id}
                      className="video-card"
                      onClick={() => this.handleVideoSelect(video)}
                    >
                      <div className="thumbnail">
                        <img
                          src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                          alt={video.title}
                        />
                        <span className="duration">{video.duration}:00</span>
                      </div>
                      <div className="video-info">
                        <h4>{video.title}</h4>
                        <p className="title-cn">{video.titleCn}</p>
                        <p className="channel">{video.channel}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default VideoLearning;
