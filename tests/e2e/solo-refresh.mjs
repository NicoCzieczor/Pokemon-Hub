// Solo journey: run cockpit, Pokémon-Center scene beside the card, graveyard, routes and backwards-compatible persistence.
import { startServer, launch, openPage, waitFor, sleep, check, failed } from './harness.mjs';

const port = 8767;
const server = await startServer(port);
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `http://localhost:${port}/Pokelocke/index.html`, {
    storage: {
      'hub-active-game': 'platin',
      'pokemon-team-builder-state': {
        generation: 4,
        game: 'omega-rot-alpha-saphir',
        team: ['bulbasaur', { name: 'charmander', route: 'Route 101' }, null, null, null, null],
        box: ['pikachu'],
      },
    },
  });

  const followers = () => page.$$eval('#pcs .pcs-mon', els => els.map(el => el.dataset.key).sort().join(','));

  await page.setViewport({ width: 1920, height: 1080 });
  await waitFor(page, () => document.querySelector('#team-focus .focus-name')?.textContent.includes('Bisasam'));
  await waitFor(page, () => document.querySelectorAll('#pcs .pcs-mon.is-ready').length === 2);
  check('Solo cockpit: first team member is focused', await page.$eval('#team-focus .focus-name', el => el.textContent) === 'Bisasam');
  check('Solo journey: active team is travelling in the scene', await page.$$eval('#journey-party [data-journey-team]', els => els.length) === 2);
  check('Solo center: beside the card is a Pokémon Center with counter, nurse and PC', await page.$eval('#pcs', el =>
    !el.classList.contains('is-bare') &&
    !!el.querySelector('.pcs-side--l .pcs-nurse') &&
    !!el.querySelector('.pcs-side--l .pcs-hit--heal') &&
    !!el.querySelector('.pcs-side--r .pcs-pc') &&
    el.getAttribute('aria-hidden') === 'true'));
  check('Solo center: the team walks around as HGSS followers', await page.$$eval('#pcs .pcs-mon-spr', els =>
    els.map(el => el.style.backgroundImage).sort().join(' ')) === 'url("followers/1.png") url("followers/4.png")');
  check('Solo center: the room stays beside the card', await page.evaluate(() => {
    const app = document.querySelector('#app').getBoundingClientRect();
    const l = document.querySelector('.pcs-side--l .pcs-room').getBoundingClientRect();
    const r = document.querySelector('.pcs-side--r .pcs-room').getBoundingClientRect();
    return l.right <= app.left + 40 && r.left >= app.right - 40 && l.right > app.left - 2 && r.left < app.right + 2;
  }));
  check('Solo game sync: the global Platinum choice wins on load', await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('pokemon-team-builder-state'));
    return document.querySelector('#journey-game')?.textContent === 'Platin' &&
      document.querySelector('#routes-game-select')?.value === 'platin' &&
      document.querySelector('#lcp-game-select')?.value === 'platin' &&
      saved.game === 'platin';
  }));

  await page.evaluate(() => window.PokeHubGame.set('omega-rot-alpha-saphir'));
  await waitFor(page, () => document.querySelector('#routes-game-select')?.value === 'omega-rot-alpha-saphir');
  check('Solo game sync: switching to ORAS changes the journey, routes and level caps', await page.evaluate(() =>
    document.querySelector('#journey-game')?.textContent === 'Omega Rubin / Alpha Saphir' &&
    document.querySelector('#lcp-game-select')?.value === 'omega-rubin-alpha-saphir' &&
    JSON.parse(localStorage.getItem('pokemon-team-builder-state')).game === 'omega-rot-alpha-saphir'));

  await page.evaluate(() => window.PokeHubGame.set('karmesin-purpur'));
  await waitFor(page, () => document.querySelector('#routes-game-select')?.value === 'karmesin-purpur');
  check('Solo game sync: every game keeps the same Pokémon Center and team', await page.evaluate(() =>
    document.querySelector('#journey-game')?.textContent === 'Karmesin / Purpur' &&
    document.querySelectorAll('#pcs .pcs-mon').length === 2 &&
    document.querySelector('#lcp-game-select')?.value === 'karmesin-purpur' &&
    JSON.parse(localStorage.getItem('pokemon-team-builder-state')).game === 'karmesin-purpur'));

  await page.evaluate(() => window.PokeHubGame.set('platin'));
  await waitFor(page, () => document.querySelector('#routes-game-select')?.value === 'platin');
  check('Solo game sync: switching back to Platinum updates the whole page', await page.evaluate(() =>
    document.querySelector('#journey-game')?.textContent === 'Platin' &&
    document.querySelector('#lcp-game-select')?.value === 'platin' &&
    JSON.parse(localStorage.getItem('pokemon-team-builder-state')).game === 'platin'));

  await page.$eval('#pcs .pcs-mon[data-key="charmander"]', el => el.click());
  await waitFor(page, () => document.querySelector('#team-focus .focus-name')?.textContent.includes('Glumanda'));
  check('Solo center: clicking a follower focuses that team member', await page.$eval('#team-focus .focus-name', el => el.textContent) === 'Glumanda');
  check('Solo center: the focused follower gets the „!" bubble', await page.$eval('#pcs .pcs-mon[data-key="charmander"]', el => !!el.querySelector('.pcs-see')));

  await page.$eval('#pcs .pcs-mon[data-key="bulbasaur"]', el => el.click());
  await waitFor(page, () => document.querySelector('#team-focus .focus-name')?.textContent.includes('Bisasam'));

  await page.$eval('#pcs .pcs-pc', el => el.click());
  await waitFor(page, () => document.querySelector('#box-toggle')?.getAttribute('aria-expanded') === 'true');
  check('Solo center: the PC opens the Pokémon box', await page.$eval('#box-toggle', el => el.getAttribute('aria-expanded')) === 'true');
  check('Solo center: the PC screen switches on', await page.$eval('#pcs .pcs-pc', el => el.classList.contains('is-on')));

  await page.$eval('#pcs .pcs-hit--heal', el => el.click());
  await waitFor(page, () => document.querySelectorAll('#pcs .pcs-mon-fx.is-away').length === 2);
  await waitFor(page, () => document.querySelectorAll('#pcs .pcs-balls i.is-in').length === 2, null, 8000);
  check('Solo center: healing puts one ball per team member on the machine', await page.$$eval('#pcs .pcs-balls i.is-in', els => els.length) === 2);
  await waitFor(page, () => !document.querySelector('#pcs .pcs-mon-fx.is-away') && !document.querySelector('#pcs .pcs-balls.is-on'), null, 15000);
  check('Solo center: after healing the team is back out', await followers() === 'bulbasaur,charmander');

  await page.click('[data-slot-menu="0"]');
  await page.click('#ctx-kill');
  await waitFor(page, () => document.querySelector('#graveyard-count')?.textContent === '1');
  check('Solo cockpit: fainted Pokémon moves to graveyard', await page.$eval('#summary-team', el => el.textContent.trim()) === '1 / 6');
  await waitFor(page, () => document.querySelectorAll('#pcs .pcs-mon').length === 1, null, 4000);
  check('Solo center: a loss fades the follower out of the room', await followers() === 'charmander');

  await page.click('#graveyard-toggle');
  await page.click('[data-grave-index="0"]');
  await page.click('[data-focus-action="restore"]');
  await waitFor(page, () => document.querySelector('#graveyard-count')?.textContent === '0');
  check('Solo cockpit: graveyard entry can be restored', await page.$eval('#summary-box', el => el.textContent.trim()) === '2 / 30');
  check('Solo center: restored to the box, not into the room', await followers() === 'charmander');

  await page.$eval('#journey-open', el => el.click());
  await waitFor(page, () => document.querySelector('#routes-toggle')?.getAttribute('aria-expanded') === 'true');
  check('Solo journey: the planner button opens the route tool', await page.$eval('#routes-toggle', el => el.getAttribute('aria-expanded')) === 'true');
  check('Solo game sync: an ORAS catch stays stored but is hidden in Platinum', await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('pokemon-team-builder-state'));
    return !document.querySelector('.route-row[data-route="Route 101"]') && saved.team[1]?.route === 'Route 101';
  }));

  await page.click('.box-slot[data-slot="1"]');
  await waitFor(page, () => document.querySelector('#team-focus .focus-name')?.textContent.includes('Bisasam'));
  await page.click('[data-focus-action="route"]');
  await waitFor(page, () => document.querySelectorAll('#route-dialog .route-dialog-option').length > 0);
  check('Solo cockpit: the focus panel opens the catch-location control', await page.$eval('#route-dialog', el => el.open));
  await page.click('#route-dialog .route-dialog-option');
  await sleep(100);

  check('Solo journey: selected game changes the landscape', await page.$eval('#solo-journey', el => el.dataset.biome) === 'mountain');
  check('Solo center: the room keeps the team after route changes', await followers() === 'charmander');
  check('Solo journey: catch log advances the route', await page.$eval('#journey-progress-value', el => Number.parseInt(el.textContent, 10)) > 0);
  check('Solo journey: route milestones are interactive', await page.$$eval('#journey-waypoints [data-journey-route]', els => els.length) > 0);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pokemon-team-builder-state')));
  check('Solo cockpit: route is persisted with the Pokémon', saved.box[1]?.name === 'bulbasaur' && !!saved.box[1]?.route, JSON.stringify(saved.box[1]));
  check('Solo cockpit: run game is persisted', saved.game === 'platin', saved.game);

  await page.reload({ waitUntil: 'networkidle0' });
  await waitFor(page, () => document.querySelector('.box-slot[data-slot="1"]')?.dataset.filled);
  const reloaded = await page.evaluate(() => JSON.parse(localStorage.getItem('pokemon-team-builder-state')).box[1]);
  check('Solo cockpit: route survives reload', reloaded?.name === 'bulbasaur' && !!reloaded?.route, JSON.stringify(reloaded));
  await waitFor(page, () => document.querySelectorAll('#pcs .pcs-mon.is-ready').length === 1);
  check('Solo center: after a reload the team just stands there (no ball, no PC message)', await page.evaluate(() =>
    !document.querySelector('#pcs .pcs-mon-fx.is-out') && !document.querySelector('#pcs .pcs-pc.is-on')));

  await page.click('#journey-waypoints [data-journey-route]');
  await waitFor(page, () => document.querySelector('#routes-toggle')?.getAttribute('aria-expanded') === 'true');
  check('Solo journey: milestones open the matching route tool', await page.$eval('#routes-toggle', el => el.getAttribute('aria-expanded')) === 'true');

  await page.setViewport({ width: 1680, height: 1000 });
  await waitFor(page, () => document.querySelector('#pcs')?.classList.contains('is-bare'));
  check('Solo center: too little room beside the card leaves only the backdrop', await page.$eval('.pcs-side--l', el => getComputedStyle(el).display === 'none'));

  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await sleep(100);
  check('Solo journey: mobile layout has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('Solo center: the scene stays out of the mobile layout', await page.$eval('#pcs', el => getComputedStyle(el).display === 'none'));
  check('Solo cockpit: no JavaScript errors', errors.length === 0, errors.join(' | '));

  await page.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

process.exitCode = failed() ? 1 : 0;
