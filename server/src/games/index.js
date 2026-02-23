const games = new Map();

function registerGame(game) {
  games.set(game.id, game);
}

function getGame(gameId) {
  return games.get(gameId);
}

function getGames() {
  return [...games.values()].map((game) => ({ id: game.id, name: game.name }));
}

module.exports = {
  registerGame,
  getGame,
  getGames,
};
