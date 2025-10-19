import { ActionIcon, Icon } from '@lobehub/ui';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import isEqual from 'fast-deep-equal';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Star } from 'lucide-react';

import { SESSION_CHAT_URL } from '@/const/url';
import { useSwitchSession } from '@/hooks/useSwitchSession';
import { useChatStore } from '@/store/chat';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { getSessionStoreState, useSessionStore } from '@/store/session';
import { sessionGroupSelectors, sessionSelectors } from '@/store/session/selectors';
import { getUserStoreState } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import SessionItem from './Item';

const TOPIC_INDENT = 44;

type AnalyticsClient = {
  track: (event: { name: string; properties?: Record<string, any> }) => void;
};

const useStyles = createStyles(({ css, token, isDarkMode }) => ({
  container: css`
    position: relative;
  `,
  toggle: css`
    position: absolute;
    left: 12px;
    top: 16px;
    z-index: 2;
  `,
  topics: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: ${TOPIC_INDENT}px;
    margin-top: 4px;
    padding-bottom: 8px;
  `,
  topicItem: css`
    align-items: center;
    border-radius: ${token.borderRadiusSM}px;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    display: flex;
    gap: 6px;
    padding: 6px 8px;
    transition: background 0.2s ${token.motionEaseOut}, color 0.2s ${token.motionEaseOut};

    &:hover {
      background: ${isDarkMode ? token.colorFillTertiary : token.colorFillSecondary};
      color: ${token.colorText};
    }
  `,
  topicActive: css`
    background: ${isDarkMode ? token.colorFillSecondary : token.colorFillTertiary};
    color: ${token.colorText};
  `,
  topicTitle: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  favorite: css`
    color: ${token.colorWarning};
  `,
  placeholder: css`
    color: ${token.colorTextQuaternary};
    font-size: 12px;
    margin-left: ${TOPIC_INDENT}px;
    padding: 4px 8px 8px;
  `,
  skeleton: css`
    margin-left: ${TOPIC_INDENT}px;
    padding: 4px 8px 8px;
  `,
}));

interface SessionListItemProps {
  analytics?: AnalyticsClient | null;
  mobile: boolean;
  sessionId: string;
}

const SessionListItem = memo<SessionListItemProps>(({ analytics, mobile, sessionId }) => {
  const { styles, cx } = useStyles();
  const { t } = useTranslation('topic');

  const switchSession = useSwitchSession();
  const [expanded, setExpanded] = useState(false);

  const isActiveSession = useSessionStore((s) => s.activeId === sessionId);

  useEffect(() => {
    if (isActiveSession) setExpanded(true);
  }, [isActiveSession]);

  const useFetchTopics = useChatStore((s) => s.useFetchTopics);
  const switchTopic = useChatStore((s) => s.switchTopic);
  const [topics, activeTopicId] = useChatStore(
    (s) => [s.topicMaps[sessionId], s.activeTopicId],
    isEqual,
  );

  const isDBInited = useGlobalStore(systemStatusSelectors.isDBInited);
  const { isLoading, isValidating } = useFetchTopics(isDBInited && expanded, sessionId);

  const handleSessionClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    switchSession(sessionId);
    setExpanded(true);

    if (!analytics) return;

    const userStore = getUserStoreState();
    const sessionStore = getSessionStoreState();

    const userId = userProfileSelectors.userId(userStore);
    const session = sessionSelectors.getSessionById(sessionId)(sessionStore);

    if (!session) return;

    const sessionGroupId = session.group || 'default';
    const group = sessionGroupSelectors.getGroupById(sessionGroupId)(sessionStore);
    const groupName = group?.name || (sessionGroupId === 'default' ? 'Default' : 'Unknown');

    analytics.track({
      name: 'switch_session',
      properties: {
        assistant_name: session.meta?.title || 'Untitled Agent',
        assistant_tags: session.meta?.tags || [],
        group_id: sessionGroupId,
        group_name: groupName,
        session_id: sessionId,
        spm: 'homepage.chat.session_list_item.click',
        user_id: userId || 'anonymous',
      },
    });
  };

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setExpanded((prev) => !prev);
  };

  const handleTopicClick = async (topicId?: string) => {
    switchSession(sessionId);
    await switchTopic(topicId);
  };

  const loading = (isLoading || isValidating) && !topics;
  const showEmpty = !loading && Array.isArray(topics) && topics.length === 0;
  const activeTopic = isActiveSession ? activeTopicId : undefined;

  return (
    <div className={styles.container}>
      <ActionIcon
        aria-expanded={expanded}
        aria-label={t('title')}
        className={styles.toggle}
        icon={expanded ? ChevronDown : ChevronRight}
        onClick={handleToggle}
        size={{ blockSize: 28, size: 16 }}
      />
      <Link href={SESSION_CHAT_URL(sessionId, mobile)} onClick={handleSessionClick}>
        <SessionItem id={sessionId} indent={TOPIC_INDENT} />
      </Link>
      {expanded && (
        <>
          {loading && (
            <div className={styles.skeleton}>
              <Skeleton.Button active size={'small'} style={{ height: 18, width: '100%' }} />
              <Skeleton.Button
                active
                size={'small'}
                style={{ height: 18, marginTop: 6, width: '80%' }}
              />
            </div>
          )}
          {showEmpty && !loading && <div className={styles.placeholder}>{t('emptyList')}</div>}
          {!loading && !showEmpty && (
            <div className={styles.topics}>
              {topics?.map((topic) => {
                const isActive = activeTopic === topic.id;

                return (
                  <div
                    aria-current={isActive}
                    className={cx(styles.topicItem, isActive && styles.topicActive)}
                    key={topic.id}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleTopicClick(topic.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        handleTopicClick(topic.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span className={styles.topicTitle}>{topic.title || t('defaultTitle')}</span>
                    {topic.favorite && (
                      <Icon className={styles.favorite} icon={Star} size={14} strokeWidth={1.75} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
});

SessionListItem.displayName = 'SessionListItem';

export default SessionListItem;
