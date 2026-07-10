// router.js — tiny shared navigation used to open a player's scorecard from any
// page (Live Scoreboard, Skins, Payouts, player lists) and return to it.
export const router = {
  navigate: null, // set by app.js
  scorecardId: null,
  from: 'live',
};

export function openScorecard(playerId, from) {
  router.scorecardId = playerId;
  router.from = from || 'live';
  if (router.navigate) router.navigate('scorecard');
}

export function scorecardBack() {
  if (router.navigate) router.navigate(router.from || 'live');
}
