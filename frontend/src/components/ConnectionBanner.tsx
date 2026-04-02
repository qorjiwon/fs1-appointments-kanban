import React from 'react';

interface ConnectionBannerProps {
  wsStatus: 'connecting' | 'connected' | 'disconnected';
  isOnline: boolean;
}

export function ConnectionBanner({ wsStatus, isOnline }: ConnectionBannerProps) {
  if (!isOnline) {
    return (
      <div className="connection-banner offline">
        네트워크 연결이 끊어졌습니다. 인터넷 연결을 확인해주세요.
      </div>
    );
  }

  if (wsStatus === 'connecting') {
    return (
      <div className="connection-banner connecting">
        실시간 연결 중...
      </div>
    );
  }

  if (wsStatus === 'disconnected') {
    return (
      <div className="connection-banner disconnected">
        실시간 연결이 끊어졌습니다. 페이지를 새로고침해주세요.
      </div>
    );
  }

  return null;
}
