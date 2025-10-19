import isEqual from 'fast-deep-equal';
import { createStyles } from 'antd-style';
import { memo, useCallback } from 'react';

import { useSwitchSession } from '@/hooks/useSwitchSession';
import { ChatStoreState, useChatStore } from '@/store/chat';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useServerConfigStore } from '@/store/serverConfig';
import { useSessionStore } from '@/store/session';

const useStyles = createStyles(({ css, token }, { mobile }: { mobile: boolean }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 4px 0 12px ${mobile ? 48 : 56}px;
  `,
  item: css`
    appearance: none;
    background: transparent;
    border: none;
    border-radius: ${token.borderRadiusSM}px;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    font-size: 12px;
    line-height: 1.4;
    padding: 4px 8px;
    text-align: left;
    transition: all 0.2s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }
  `,
  active: css`
    background: ${token.colorFillSecondary};
    color: ${token.colorText};
  `,
}));

interface SessionTopicListProps {
  sessionId: string;
}

const SessionTopicList = memo<SessionTopicListProps>(({ sessionId }) => {
  const mobile = useServerConfigStore((s) => s.isMobile);
  const { styles, cx } = useStyles({ mobile });

  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const useFetchTopics = useChatStore((s) => s.useFetchTopics);
  useFetchTopics(isDBInited, sessionId);

  const selectTopics = useCallback(
    (state: ChatStoreState) => state.topicMaps[sessionId],
    [sessionId],
  );
  const topics = useChatStore(selectTopics, isEqual);

  const activeTopicId = useChatStore((s) => s.activeTopicId);
  const switchTopic = useChatStore((s) => s.switchTopic);
  const activeSessionId = useSessionStore((s) => s.activeId);

  const switchSession = useSwitchSession();

  const handleTopicClick = useCallback(
    async (topicId: string) => {
      switchSession(sessionId);
      await switchTopic(topicId);
    },
    [sessionId, switchSession, switchTopic],
  );

  if (!topics || topics.length === 0) return null;

  const isActiveSession = activeSessionId === sessionId;

  return (
    <div className={styles.container}>
      {topics.map((topic) => {
        const isActive = isActiveSession && activeTopicId === topic.id;

        return (
          <button
            className={cx(styles.item, isActive && styles.active)}
            key={topic.id}
            onClick={() => void handleTopicClick(topic.id)}
            type="button"
          >
            {topic.title}
          </button>
        );
      })}
    </div>
  );
});

SessionTopicList.displayName = 'SessionTopicList';

export default SessionTopicList;
