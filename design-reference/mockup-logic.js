
class Component extends DCLogic {
  state = { screen: 'index', join: '', vote: null, voted: false };

  go(s) { this.setState({ screen: s, voted: false }); try { window.scrollTo(0, 0); } catch(e){} }

  renderVals() {
    const s = this.state.screen;
    const players = ['Tú', 'Nacho', 'Sole', 'Mati', 'Caro', 'Bruno'];

    const nav = [
      { id: 'index', label: 'Inicio' },
      { id: 'lobby', label: 'Lobby' },
      { id: 'game', label: 'Juego' },
      { id: 'results', label: 'Votos' },
      { id: 'leaderboard', label: 'Ranking' },
      { id: 'gameover', label: 'Fin' },
    ];
    const navItems = nav.map(n => {
      const active = s === n.id;
      return {
        label: n.label,
        go: () => this.go(n.id),
        style: `flex:1; min-width:0; padding:11px 2px 9px; background:transparent; border:none; border-top:4px solid ${active ? '#ff0080' : 'transparent'}; margin-top:-4px; color:${active ? '#ff0080' : '#777'}; font-family:'Oswald',sans-serif; font-weight:700; font-size:11px; letter-spacing:.06em; text-transform:uppercase; cursor:pointer;`,
      };
    });

    const baseVote = "display:flex; align-items:center; justify-content:center; text-align:center; padding:18px 6px; font-family:'Anton',sans-serif; font-size:21px; letter-spacing:.03em; text-transform:uppercase; border:3px solid #0a0a0a; cursor:pointer; line-height:1;";
    const voteItems = players.map(p => {
      const sel = this.state.vote === p;
      return {
        name: p,
        pick: () => this.setState({ vote: p }),
        style: baseVote + `background:${sel ? '#ff0080' : '#fff'}; color:#0a0a0a; transform:rotate(${sel ? '-1.5deg' : '0deg'}); box-shadow:${sel ? '4px 4px 0 #0a0a0a' : 'none'};`,
      };
    });

    const lobbyPlayers = [
      { name: 'Tú', host: true },
      { name: 'Nacho', host: false },
      { name: 'Sole', host: false },
      { name: 'Mati', host: false },
      { name: 'Caro', host: false },
    ].map((p, i) => ({ ...p, posLabel: String(i + 1) }));

    const ranking = [
      { name: 'Sole', cards: 4 },
      { name: 'Nacho', cards: 3 },
      { name: 'Tú', cards: 2 },
      { name: 'Caro', cards: 1 },
      { name: 'Mati', cards: 1 },
      { name: 'Bruno', cards: 0 },
    ].map((r, i) => ({
      ...r, pos: i + 1, leader: i === 0,
      rowStyle: `display:flex; align-items:stretch; border-top:3px solid #0a0a0a; background:${i === 0 ? '#ececec' : '#fff'};`,
    }));

    return {
      isIndex: s === 'index', isLobby: s === 'lobby', isGame: s === 'game',
      isResults: s === 'results', isLeaderboard: s === 'leaderboard', isGameover: s === 'gameover',
      navItems,
      go_lobby: () => this.go('lobby'),
      go_game: () => this.go('game'),
      go_results: () => this.go('results'),
      go_leaderboard: () => this.go('leaderboard'),
      go_gameover: () => this.go('gameover'),
      go_index: () => this.go('index'),
      join: this.state.join,
      on_join: (e) => this.setState({ join: (e.target.value || '').toUpperCase().slice(0, 4) }),
      voteItems,
      voteReady: this.state.vote !== null,
      voteNotReady: this.state.vote === null,
      voteName: this.state.vote || '',
      castVote: () => this.go('results'),
      lobbyPlayers,
      ranking,
      question: '¿Quién es más probable que termine en la cárcel?',
    };
  }
}
