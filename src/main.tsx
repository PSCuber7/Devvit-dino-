// src/main.tsx
import Devvit, { useWebView } from '@devvit/public-api';

type InMsg =
  | { type: 'ready' }
  | { type: 'score'; data: { score: number } }
  | { type: 'getLeaderboard' };

type OutMsg =
  | { type: 'init'; data: { username: string } }
  | { type: 'leaderboard'; data: { top: { user: string; score: number }[] } };

Devvit.addMenuItem({
  id: 'dino_play',
  label: 'Play Dino',
  onClick: (context) => {
    const web = useWebView<InMsg, OutMsg>({
      url: 'index.html',
      onMessage: async (msg, webView) => {
        if (msg.type === 'ready') {
          webView.postMessage({ type: 'init', data: { username: context.userName ?? 'redditor' } });
        } else if (msg.type === 'score') {
          const score = msg.data.score;
          const key = `dino_lb_${context.postId}`;
          // add score to sorted set (use timestamp as tiebreaker)
          await context.redis.zAdd(key, [{ member: `${context.userName ?? 'anon'}#${Date.now()}`, score }]);
          // trim to top 10
          const raw = await context.redis.zRangeWithScores(key, -10, -1);
          const top = raw
            .map((r) => ({ user: String(r.member).split('#')[0], score: Math.round(r.score) }))
            .sort((a, b) => b.score - a.score);
          webView.postMessage({ type: 'leaderboard', data: { top } });
        } else if (msg.type === 'getLeaderboard') {
          const key = `dino_lb_${context.postId}`;
          const raw = await context.redis.zRangeWithScores(key, -10, -1);
          const top = raw
            .map((r) => ({ user: String(r.member).split('#')[0], score: Math.round(r.score) }))
            .sort((a, b) => b.score - a.score);
          web.postMessage({ type: 'leaderboard', data: { top } });
        }
      },
    });

    // Render a simple block so the menu item shows up (template behavior)
    return {
      height: 'regular',
      view: {
        type: 'text',
        text: 'T-Rex Dino — open via the menu to play!',
      },
    };
  },
});

export default Devvit;
